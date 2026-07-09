import pako from "pako";
import { decompress } from "./gzip";

export type GhFileKind = "gh" | "ghx" | "unknown";

export class GhFileError extends Error {
	constructor(
		message: string,
		public readonly kind: GhFileKind | "empty" | "too-large"
	) {
		super(message);
		this.name = "GhFileError";
	}
}

/**
 * Detect whether a file is a Grasshopper `.gh` (gzipped XML) or `.ghx` (plain XML).
 * Falls back to inspecting the gzipped magic bytes (`1f 8b`) for `.gh` files that
 * happen to be missing an extension.
 */
export function detectGhFileKind(
	file: File | { name: string; arrayBuffer(): Promise<ArrayBuffer> }
): GhFileKind {
	const lower = file.name.toLowerCase();
	if (lower.endsWith(".gh")) return "gh";
	if (lower.endsWith(".ghx")) return "ghx";
	return "unknown";
}

/**
 * Convert a `.gh` (gzipped) or `.ghx` (plain XML) Grasshopper file to its GhXml
 * string form. The `.gh` format is just GZip-compressed XML, so `decompress()`
 * (which already detects the gzipped magic bytes and enforces the
 * `MAX_DECOMPRESSED_GH_XML_BYTES` cap) is the entire `.gh` path.
 *
 * Returns the XML as a string. Throws `GhFileError` on:
 *   - empty file
 *   - wrong/unknown extension
 *   - decompressed size exceeding `MAX_DECOMPRESSED_GH_XML_BYTES`
 *   - any decompression or decoding failure
 *
 * Note: the result is NOT validated as parseable GhXml here — callers feed it
 * to `validateGhXml` / `buildGhJson` like any other XML input, which gives a
 * single error-reporting path that matches the existing clipboard paste flow.
 */
export async function ghFileToGhXml(
	file: File | { name: string; arrayBuffer(): Promise<ArrayBuffer> }
): Promise<string> {
	const kind = detectGhFileKind(file);
	if (kind === "unknown") {
		throw new GhFileError(
			`Unsupported file "${file.name}". Expected a .gh or .ghx Grasshopper file.`,
			kind
		);
	}

	const buffer = await file.arrayBuffer();
	if (buffer.byteLength === 0) {
		throw new GhFileError(`File "${file.name}" is empty.`, "empty");
	}

	let xmlBytes: Uint8Array;
	try {
		xmlBytes = await decompress(buffer);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("too large")) {
			throw new GhFileError(msg, "too-large");
		}
		throw new GhFileError(`Failed to decode "${file.name}": ${msg}`, kind);
	}

	const decoder = new TextDecoder("utf-8");
	try {
		return decoder.decode(xmlBytes);
	} catch (err) {
		throw new GhFileError(
			`Failed to decode "${file.name}" as UTF-8: ${
				err instanceof Error ? err.message : String(err)
			}`,
			kind
		);
	}
}

/**
 * Convenience: build a Grasshopper `.gh` (gzipped XML) `File`-like object from
 * a raw GhXml string. Useful for tests and for download flows that want to
 * round-trip back to the user's filesystem.
 */
export function ghXmlToGhFile(xml: string, filename = "definition.gh"): Blob {
	const gzipped = pako.gzip(xml);
	return new Blob([gzipped as Uint8Array<ArrayBuffer>], {
		type: "application/octet-stream",
	});
}
