import { buildGhJson } from "../parser/src/parser";
import { buildPreview } from "../src/app/lib/build-preview";
import { decompress } from "../src/app/utils/gzip";

export const MAX_BACKFILL_COMPRESSED_BYTES = 8 * 1024 * 1024;
export const MAX_BACKFILL_DECOMPRESSED_BYTES = 40 * 1024 * 1024;

export async function previewFromBytes(bytes: ArrayBuffer) {
	if (bytes.byteLength > MAX_BACKFILL_COMPRESSED_BYTES) return null;
	let decoded: Uint8Array;
	try {
		decoded = await decompress(bytes, MAX_BACKFILL_DECOMPRESSED_BYTES);
	} catch (error) {
		if (error instanceof Error && error.message === "GhXml is too large")
			return null;
		throw error;
	}
	const xml = new TextDecoder("utf-8", { fatal: true }).decode(decoded);
	return buildPreview(buildGhJson(xml, { includeVisuals: true }));
}
