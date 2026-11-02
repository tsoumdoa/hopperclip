import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { buildGhJson } from "../parser/src/parser";
import * as previewBuilder from "../src/app/lib/build-preview";
import { validatePreview } from "./previewData";
import {
	MAX_BACKFILL_XML_BYTES,
	previewFromResponse,
	readXmlBytes,
} from "./previewBackfillNode";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const xml = readFileSync("parser/sand/xmls/three-grouped.xml", "utf8");

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test.each(["three-grouped", "with-preview-boundary"])(
	"preview matches the existing digest for raw XML and real gzip: %s",
	async (fixture) => {
		const xml = readFileSync(`parser/sand/xmls/${fixture}.xml`, "utf8");
		const expected = previewBuilder.buildPreview(
			buildGhJson(xml, { includeVisuals: true })
		);
		expect(expected.count).toBeGreaterThan(0);
		for (const bytes of [gzipSync(xml), new TextEncoder().encode(xml)]) {
			const preview = await previewFromResponse(
				new Response(bytes, {
					// Deliberately stale metadata, as returned by Node's auto-decoding fetch.
					headers: {
						"content-encoding": "gzip",
						"content-length": "999999999",
					},
				})
			);
			expect(preview).toEqual(expected);
			validatePreview(preview as Exclude<typeof preview, string>);
		}
	}
);

test("decoded XML is capped while streaming and the source is canceled early", async () => {
	let reads = 0;
	const cancel = vi.fn();
	const response = new Response(
		new ReadableStream({
			pull(controller) {
				reads++;
				controller.enqueue(new Uint8Array(64 * 1024).fill(32));
			},
			cancel,
		})
	);
	expect(await readXmlBytes(response)).toBe("skipped:too-large");
	expect(cancel).toHaveBeenCalledOnce();
	expect(reads).toBeLessThan(200);
});

test("still-gzip expansion has the same cap, including highly compressed XML", async () => {
	const bytes = gzipSync(Buffer.alloc(MAX_BACKFILL_XML_BYTES + 1, 32));
	expect(bytes.byteLength).toBeLessThan(20_000);
	expect(await previewFromResponse(new Response(bytes))).toBe(
		"skipped:too-large"
	);
	for (const payload of [
		new Uint8Array(MAX_BACKFILL_XML_BYTES),
		gzipSync(Buffer.alloc(MAX_BACKFILL_XML_BYTES, 32)),
	]) {
		const decoded = await readXmlBytes(new Response(payload));
		expect(decoded).toBeInstanceOf(Uint8Array);
		expect((decoded as Uint8Array).length).toBe(MAX_BACKFILL_XML_BYTES);
	}
});

test("gzip magic split across chunks is decoded", async () => {
	const gzip = gzipSync(xml);
	const response = new Response(
		new ReadableStream({
			start(controller) {
				controller.enqueue(gzip.subarray(0, 1));
				controller.enqueue(gzip.subarray(1));
				controller.close();
			},
		})
	);
	expect(await previewFromResponse(response)).toEqual(
		await previewFromResponse(new Response(xml))
	);
});

test.each([
	[new Uint8Array([0x1f, 0x8b, 0]), "skipped:invalid-gzip"],
	[new Uint8Array([0xff]), "skipped:not-xml"],
	["not XML", "skipped:not-xml"],
	["<Archive><broken></Archive>", "skipped:parse-error"],
	["<other />", "skipped:parse-error"],
])("deterministic data failure returns a status: %s", async (body, status) => {
	expect(await previewFromResponse(new Response(body))).toBe(status);
});

test("build failures return a status", async () => {
	vi.spyOn(previewBuilder, "buildPreview").mockImplementation(() => {
		throw new Error("bad geometry");
	});
	expect(await previewFromResponse(new Response(xml))).toBe(
		"skipped:build-error"
	);
});

test.each([429, 503])("transient HTTP %i throws", async (status) => {
	await expect(
		previewFromResponse(new Response(null, { status }))
	).rejects.toThrow(`Storage GET failed: ${status}`);
});

test.each([false, true])(
	"body network failures throw for decoded and gzip streams: %s",
	async (gzip) => {
		let sent = false;
		const bytes = gzip
			? gzipSync(xml).subarray(0, 10)
			: new TextEncoder().encode("<Archive>");
		const response = new Response(
			new ReadableStream({
				pull(controller) {
					if (!sent) {
						sent = true;
						controller.enqueue(bytes);
					} else controller.error(new Error("connection reset"));
				},
			})
		);
		await expect(previewFromResponse(response)).rejects.toThrow();
	}
);

async function workerSetup() {
	vi.stubEnv("R2_URL", "https://example.test/bucket");
	vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
	vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
	const t = convexTest(schema, modules);
	const id = await t.run((ctx) =>
		ctx.db.insert("post", {
			clerkUserId: "alice",
			bucketUrl: "file",
			name: "Snippet",
			dateCreated: "2026-11-01",
			dateUpdated: "2026-11-01",
		})
	);
	const fetch = vi.fn<typeof globalThis.fetch>();
	vi.stubGlobal("fetch", fetch);
	return { t, id, fetch, args: { clerkUserId: "alice", storageKey: "file" } };
}

test("worker saves once, skips current previews and skips posts gone before download", async () => {
	const { t, id, fetch, args } = await workerSetup();
	fetch.mockResolvedValueOnce(new Response(xml));
	expect(await t.action(internal.previewBackfillNode.buildOne, args)).toBe(
		"saved"
	);
	expect(await t.action(internal.previewBackfillNode.buildOne, args)).toBe(
		"unchanged"
	);
	await t.run((ctx) => ctx.db.delete(id));
	expect(await t.action(internal.previewBackfillNode.buildOne, args)).toBe(
		"skipped:post-gone"
	);
	expect(fetch).toHaveBeenCalledOnce();
});

test("worker skips a key replaced during download", async () => {
	const { t, id, fetch, args } = await workerSetup();
	fetch.mockImplementationOnce(async () => {
		await t.run((ctx) => ctx.db.patch(id, { bucketUrl: "replacement" }));
		return new Response(xml);
	});
	expect(await t.action(internal.previewBackfillNode.buildOne, args)).toBe(
		"skipped:post-gone"
	);
	expect(await t.run((ctx) => ctx.db.query("postPreviews").collect())).toEqual(
		[]
	);
});

test.each([404, 403])(
	"worker returns deterministic HTTP %i and releases the body",
	async (status) => {
		const { t, fetch, args } = await workerSetup();
		const cancel = vi.fn();
		fetch.mockResolvedValueOnce(
			new Response(new ReadableStream({ cancel }), { status })
		);
		expect(await t.action(internal.previewBackfillNode.buildOne, args)).toBe(
			`skipped:http-${status}`
		);
		expect(cancel).toHaveBeenCalledOnce();
	}
);

test.each(["network", "abort", "503"])(
	"worker throws on transient download failure: %s",
	async (failure) => {
		const { t, fetch, args } = await workerSetup();
		if (failure === "503")
			fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
		else
			fetch.mockRejectedValueOnce(
				failure === "abort"
					? new DOMException("deadline", "AbortError")
					: new Error("network failed")
			);
		await expect(
			t.action(internal.previewBackfillNode.buildOne, args)
		).rejects.toThrow("Preview backfill download failed");
	}
);

test("storage deadline remains active until the body read finishes", async () => {
	const { t, fetch, args } = await workerSetup();
	vi.useFakeTimers();
	try {
		let markReading!: () => void;
		const reading = new Promise<void>((resolve) => {
			markReading = resolve;
		});
		fetch.mockImplementationOnce(
			async (request) =>
				new Response(
					new ReadableStream({
						start(controller) {
							(request as Request).signal.addEventListener("abort", () =>
								controller.error(new DOMException("deadline", "AbortError"))
							);
							markReading();
						},
					})
				)
		);
		const result = expect(
			t.action(internal.previewBackfillNode.buildOne, args)
		).rejects.toThrow("Preview backfill download failed");
		await reading;
		await vi.advanceTimersByTimeAsync(30_000);
		await result;
	} finally {
		vi.useRealTimers();
	}
});
