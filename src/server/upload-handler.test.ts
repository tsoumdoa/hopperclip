import { gzipSync } from "node:zlib";
import { describe, expect, test, vi } from "vitest";
import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";
import { createUploadHandler } from "./upload-handler";

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
	test("rejects anonymous users without pulling body or creating a reservation", async () => {
		const setup = fixture(false);
		const body = bodyStream([gzip]);
		expect((await setup.handler(request(body.stream))).status).toBe(401);
		expect(body.pull).not.toHaveBeenCalled();
		expect(body.cancel).toHaveBeenCalledOnce();
		expect(setup.reserve).not.toHaveBeenCalled();
		expect(setup.put).not.toHaveBeenCalled();
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
});
