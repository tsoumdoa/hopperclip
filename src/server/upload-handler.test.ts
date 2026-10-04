import { gzipSync } from "node:zlib";
import { describe, expect, test, vi } from "vitest";
import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";
import { createUploadHandler, readBoundedUpload } from "./upload-handler";

const origin = "https://hopperclip.example";
const gzip = new Uint8Array(gzipSync("<Archive>example</Archive>"));

function bodyStream(chunks: Uint8Array[], keepOpen = false) {
	let index = 0;
	const cancel = vi.fn();
	const pull = vi.fn(
		(controller: ReadableStreamDefaultController<Uint8Array>) => {
			if (index < chunks.length) controller.enqueue(chunks[index++]);
			else if (!keepOpen) controller.close();
		}
	);
	const stream = new ReadableStream<Uint8Array>(
		{ pull, cancel },
		{ highWaterMark: 0 }
	);
	return { stream, cancel, pull };
}

function request(
	stream: ReadableStream<Uint8Array>,
	headers: Record<string, string | undefined> = {},
	signal?: AbortSignal,
	url = `${origin}/api/uploads`
) {
	const requestHeaders = new Headers({
		origin,
		"sec-fetch-site": "same-origin",
		"content-type": "application/gzip",
	});
	for (const [key, value] of Object.entries(headers)) {
		if (value !== undefined) requestHeaders.set(key, value);
	}
	return new Request(url, {
		method: "POST",
		headers: requestHeaders,
		body: stream,
		signal,
		duplex: "half",
	} as RequestInit);
}

function fixture(authenticated = true) {
	const reservation = {
		key: "server-generated-key",
		clerkUserId: "user-1",
		uploadId: "reservation-id",
		expiresAt: Date.now() + 24 * 60 * 60 * 1000,
	};
	const reserve = vi.fn(async () => reservation);
	const complete = vi.fn(async () => ({ key: reservation.key }));
	const authenticate = vi.fn(async () =>
		authenticated ? { userId: "user-1", reserve, complete } : null
	);
	const put = vi.fn(async () => {});
	const dependencies = { trustedOrigin: origin, authenticate, put };
	const handler = createUploadHandler(dependencies);
	return {
		handler,
		dependencies,
		authenticate,
		reserve,
		complete,
		put,
		reservation,
	};
}

describe("binary upload request boundary", () => {
	test("authenticates and durably reserves before reading, then finalizes after R2", async () => {
		const setup = fixture();
		const body = bodyStream([gzip.subarray(0, 7), gzip.subarray(7)]);
		setup.authenticate.mockImplementationOnce(async () => {
			expect(body.pull).not.toHaveBeenCalled();
			return {
				userId: "user-1",
				reserve: setup.reserve,
				complete: setup.complete,
			};
		});
		setup.reserve.mockImplementationOnce(async () => {
			expect(body.pull).not.toHaveBeenCalled();
			return setup.reservation;
		});
		setup.put.mockImplementationOnce(async () => {
			expect(setup.complete).not.toHaveBeenCalled();
		});
		const response = await setup.handler(request(body.stream));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ key: setup.reservation.key });
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(setup.put).toHaveBeenCalledWith(
			"user-1",
			setup.reservation.key,
			gzip,
			expect.any(AbortSignal)
		);
		expect(setup.complete).toHaveBeenCalledWith(setup.reservation);
	});

	test("rejects anonymous users without pulling body or creating a reservation", async () => {
		const setup = fixture(false);
		const body = bodyStream([gzip]);
		expect((await setup.handler(request(body.stream))).status).toBe(401);
		expect(body.pull).not.toHaveBeenCalled();
		expect(body.cancel).toHaveBeenCalledOnce();
		expect(setup.reserve).not.toHaveBeenCalled();
		expect(setup.put).not.toHaveBeenCalled();
	});

	test.each([
		{ origin: "https://evil.example" },
		{ origin: "https://hopperclip.example.evil.example" },
		{ origin: "https://sub.hopperclip.example" },
		{ origin: "null" },
		{ origin: "" },
		{ "sec-fetch-site": "cross-site" },
		{ "sec-fetch-site": "same-site" },
		{ "sec-fetch-site": "none" },
	])("blocks CSRF before authentication or reading: %j", async (headers) => {
		const setup = fixture();
		const body = bodyStream([gzip]);
		expect((await setup.handler(request(body.stream, headers))).status).toBe(
			403
		);
		expect(setup.authenticate).not.toHaveBeenCalled();
		expect(body.pull).not.toHaveBeenCalled();
		expect(body.cancel).toHaveBeenCalledOnce();
	});

	test("requires Origin even if Sec-Fetch-Site claims same-origin", async () => {
		const setup = fixture();
		const body = bodyStream([gzip]);
		const input = request(body.stream);
		input.headers.delete("origin");
		expect((await setup.handler(input)).status).toBe(403);
		expect(body.pull).not.toHaveBeenCalled();
	});

	test("allows missing fetch metadata only with the exact trusted Origin", async () => {
		const setup = fixture();
		const input = request(bodyStream([gzip]).stream);
		input.headers.delete("sec-fetch-site");
		expect((await setup.handler(input)).status).toBe(200);
	});

	test("only allows matching loopback development origins in development", async () => {
		const setup = fixture();
		const localRequest = () =>
			request(
				bodyStream([gzip]).stream,
				{ origin: "http://localhost:3000" },
				undefined,
				"http://localhost:3000/api/uploads"
			);
		expect((await setup.handler(localRequest())).status).toBe(403);
		const development = createUploadHandler({
			...setup.dependencies,
			allowLocalDevelopment: true,
		});
		expect((await development(localRequest())).status).toBe(200);
		expect(
			(
				await development(
					request(
						bodyStream([gzip]).stream,
						{ origin: "http://evil.example:3000" },
						undefined,
						"http://evil.example:3000/api/uploads"
					)
				)
			).status
		).toBe(403);
	});

	test.each([
		[{ "content-type": "application/json" }, 415],
		[{ "content-type": "multipart/form-data; boundary=foo" }, 415],
		[{ "content-encoding": "gzip" }, 415],
		[{ "content-length": "-1" }, 400],
		[{ "content-length": "10.5" }, 400],
		[{ "content-length": "1e5" }, 400],
		[{ "content-length": "0" }, 400],
		[{ "content-length": String(MAX_COMPRESSED_GH_XML_BYTES + 1) }, 413],
	])("rejects invalid headers before reading: %j", async (headers, status) => {
		const setup = fixture();
		const body = bodyStream([gzip]);
		expect((await setup.handler(request(body.stream, headers))).status).toBe(
			status
		);
		expect(body.pull).not.toHaveBeenCalled();
		expect(setup.authenticate).not.toHaveBeenCalled();
	});

	test.each([undefined, String(MAX_COMPRESSED_GH_XML_BYTES)])(
		"caps actual streamed bytes with declared length %s",
		async (length) => {
			const setup = fixture();
			const limitSizedChunk = new Uint8Array(MAX_COMPRESSED_GH_XML_BYTES);
			limitSizedChunk.set(gzip);
			const body = bodyStream([limitSizedChunk, new Uint8Array(1)], true);
			const headers = length === undefined ? {} : { "content-length": length };
			expect((await setup.handler(request(body.stream, headers))).status).toBe(
				413
			);
			expect(body.cancel).toHaveBeenCalledOnce();
			expect(setup.put).not.toHaveBeenCalled();
			expect(setup.complete).not.toHaveBeenCalled();
		}
	);

	test("does not allocate the full limit for a small upload with unknown length", async () => {
		const bytes = await readBoundedUpload(
			bodyStream([new Uint8Array(0), gzip]).stream,
			new AbortController().signal
		);
		expect(bytes).toEqual(gzip);
		expect(bytes.buffer.byteLength).toBe(64 * 1024);
	});

	test("uses one exact buffer for a known length", async () => {
		const bytes = await readBoundedUpload(
			bodyStream([gzip]).stream,
			new AbortController().signal,
			gzip.byteLength
		);
		expect(bytes.buffer.byteLength).toBe(gzip.byteLength);
	});

	test("cancels immediately when a chunk exceeds a falsely small declared length", async () => {
		const setup = fixture();
		const body = bodyStream([gzip], true);
		expect(
			(await setup.handler(request(body.stream, { "content-length": "1" })))
				.status
		).toBe(400);
		expect(body.cancel).toHaveBeenCalledOnce();
		expect(setup.put).not.toHaveBeenCalled();
	});

	test("accepts the exact cap without an extra concatenation buffer", async () => {
		const limitSizedChunk = new Uint8Array(MAX_COMPRESSED_GH_XML_BYTES);
		limitSizedChunk.set(gzip);
		const bytes = await readBoundedUpload(
			bodyStream([limitSizedChunk]).stream,
			new AbortController().signal,
			MAX_COMPRESSED_GH_XML_BYTES
		);
		expect(bytes.byteLength).toBe(MAX_COMPRESSED_GH_XML_BYTES);
		expect(bytes.buffer.byteLength).toBe(MAX_COMPRESSED_GH_XML_BYTES);
	});

	test.each(["1", String(gzip.byteLength + 1)])(
		"rejects a false length %s even below the cap",
		async (length) => {
			const setup = fixture();
			expect(
				(
					await setup.handler(
						request(bodyStream([gzip]).stream, {
							"content-length": length,
						})
					)
				).status
			).toBe(400);
			expect(setup.put).not.toHaveBeenCalled();
		}
	);

	test.each([
		new Uint8Array(),
		new TextEncoder().encode("not compressed gzip content"),
	])("rejects empty or non-gzip bytes", async (bytes) => {
		const setup = fixture();
		expect(
			(await setup.handler(request(bodyStream([bytes]).stream))).status
		).toBe(400);
		expect(setup.put).not.toHaveBeenCalled();
	});

	test("cancels a stalled body immediately on client abort and does not finalize", async () => {
		const setup = fixture();
		const controller = new AbortController();
		const body = bodyStream([], true);
		const result = setup.handler(request(body.stream, {}, controller.signal));
		await vi.waitFor(() => expect(body.pull).toHaveBeenCalledOnce());
		controller.abort();
		expect((await result).status).toBe(408);
		expect(body.cancel).toHaveBeenCalledOnce();
		expect(setup.put).not.toHaveBeenCalled();
		expect(setup.complete).not.toHaveBeenCalled();
	});

	test("forwards abort to an in-flight R2 write and does not finalize", async () => {
		const setup = fixture();
		const controller = new AbortController();
		const put = vi.fn(
			async (
				_user: string,
				_key: string,
				_bytes: Uint8Array<ArrayBuffer>,
				signal: AbortSignal
			) => {
				await new Promise<void>((_resolve, reject) =>
					signal.addEventListener("abort", () => reject(signal.reason), {
						once: true,
					})
				);
			}
		);
		const handler = createUploadHandler({ ...setup.dependencies, put });
		const result = handler(
			request(bodyStream([gzip]).stream, {}, controller.signal)
		);
		await vi.waitFor(() => expect(put).toHaveBeenCalledOnce());
		controller.abort();
		expect((await result).status).toBe(408);
		expect(setup.complete).not.toHaveBeenCalled();
	});

	test("leaves failed R2 writes reserved for durable cleanup, without exposing backend errors", async () => {
		const setup = fixture();
		setup.put.mockRejectedValueOnce(
			new Error("https://private-bucket/secret-key")
		);
		const response = await setup.handler(request(bodyStream([gzip]).stream));
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain("private-bucket");
		expect(setup.complete).not.toHaveBeenCalled();
	});

	test("does not return a key if durable finalization fails", async () => {
		const setup = fixture();
		setup.complete.mockRejectedValueOnce(new Error("backend unavailable"));
		const response = await setup.handler(request(bodyStream([gzip]).stream));
		expect(response.status).toBe(503);
		expect(await response.json()).not.toHaveProperty("key");
	});

	test("does not write when the reservation no longer covers the maximum PUT time", async () => {
		const setup = fixture();
		setup.reservation.expiresAt = Date.now() + 30_000;
		expect(
			(await setup.handler(request(bodyStream([gzip]).stream))).status
		).toBe(408);
		expect(setup.put).not.toHaveBeenCalled();
		expect(setup.complete).not.toHaveBeenCalled();
	});
});
