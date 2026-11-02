import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";
import { buildGhJson } from "../parser/src/parser";
import { buildPreview } from "../src/app/lib/build-preview";
import { validatePreview } from "./previewData";
import {
	MAX_BACKFILL_COMPRESSED_BYTES,
	MAX_BACKFILL_DECOMPRESSED_BYTES,
	previewFromBytes,
} from "./previewBackfillData";
import { readStorageBody } from "./storageR2";

const xml = readFileSync("parser/sand/xmls/with-preview-boundary.xml", "utf8");
function buffer(bytes: Uint8Array): ArrayBuffer {
	return new Uint8Array(bytes).buffer;
}

test("Node preview pipeline matches the existing digest for gzip and already decoded XML", async () => {
	const expected = buildPreview(buildGhJson(xml, { includeVisuals: true }));
	expect(expected.count).toBeGreaterThan(0);
	expect(expected.nodes.length).toBeGreaterThan(0);
	for (const bytes of [gzipSync(xml), new TextEncoder().encode(xml)]) {
		const preview = await previewFromBytes(buffer(bytes));
		expect(preview).toEqual(expected);
		validatePreview(preview!);
	}
});

test("byte pipeline skips oversized downloads and gzip expansion before parsing", async () => {
	expect(
		await previewFromBytes(new ArrayBuffer(MAX_BACKFILL_COMPRESSED_BYTES + 1))
	).toBeNull();
	const bomb = gzipSync(Buffer.alloc(MAX_BACKFILL_DECOMPRESSED_BYTES + 1, 32));
	expect(bomb.byteLength).toBeLessThan(MAX_BACKFILL_COMPRESSED_BYTES);
	expect(await previewFromBytes(buffer(bomb))).toBeNull();
});

test("corrupt gzip and invalid UTF-8 fail without returning a digest", async () => {
	await expect(
		previewFromBytes(buffer(new Uint8Array([0x1f, 0x8b, 0])))
	).rejects.toThrow();
	await expect(
		previewFromBytes(buffer(new Uint8Array([0xff])))
	).rejects.toThrow();
});

test("storage reader checks Content-Length before reading and enforces the actual stream limit", async () => {
	let reads = 0;
	const advertised = new Response(
		new ReadableStream(
			{
				pull() {
					reads++;
				},
			},
			{ highWaterMark: 0 }
		),
		{ headers: { "content-length": "9" } }
	);
	expect(await readStorageBody(advertised, 8)).toBeNull();
	expect(reads).toBe(0);
	await advertised.body!.cancel();
	for (const headers of [
		new Headers(),
		new Headers({ "content-length": "1" }),
	]) {
		let cancelled = false;
		const response = new Response(
			new ReadableStream({
				pull(controller) {
					controller.enqueue(new Uint8Array(5));
				},
				cancel() {
					cancelled = true;
				},
			}),
			{ headers }
		);
		expect(await readStorageBody(response, 8)).toBeNull();
		expect(cancelled).toBe(true);
	}
	const response = new Response(new Uint8Array([1, 2, 3, 4]), {
		headers: { "content-length": "4" },
	});
	expect(new Uint8Array((await readStorageBody(response, 4))!)).toEqual(
		new Uint8Array([1, 2, 3, 4])
	);
});
