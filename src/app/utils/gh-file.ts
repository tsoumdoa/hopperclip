import pako from "pako";
import { decompress } from "./gzip";
import { grasshopperBinaryToXml, inflateGrasshopperBinary } from "./gh-binary";

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
 * Detect whether a file is a Grasshopper `.gh` or `.ghx` archive.
 */
export function detectGhFileKind(
	file: File | { name: string; arrayBuffer(): Promise<ArrayBuffer> }
): GhFileKind {
	const lower = file.name.toLowerCase();
	if (lower.endsWith(".gh")) return "gh";
	if (lower.endsWith(".ghx")) return "ghx";
	return "unknown";
}

function looksLikeXml(text: string) {
	const trimmed = text.trimStart();
	return trimmed.startsWith("<?xml") || trimmed.startsWith("<Archive");
}

function decodeUtf8(bytes: Uint8Array, filename: string, kind: GhFileKind) {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch (err) {
		throw new GhFileError(
			`Failed to decode "${filename}" as UTF-8: ${
				err instanceof Error ? err.message : String(err)
			}`,
			kind
		);
	}
}

/**
 * Convert a `.gh` or `.ghx` Grasshopper file to its GhXml string form.
 *
 * Native `.gh` files are raw-DEFLATE compressed GH_IO binary archives. Some
 * legacy app flows also produced gzip-compressed XML with a `.gh` extension, so
 * this keeps that path for backwards compatibility.
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

	if (kind === "gh") {
		const view = new Uint8Array(buffer);
		const isGzipped = view[0] === 0x1f && view[1] === 0x8b;

		if (!isGzipped) {
			const plainText = new TextDecoder("utf-8").decode(view);
			if (looksLikeXml(plainText)) {
				return plainText;
			}

			let inflated: Uint8Array;
			try {
				inflated = inflateGrasshopperBinary(buffer);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.includes("too large")) {
					throw new GhFileError(msg, "too-large");
				}

				return plainText;
			}

			const inflatedText = new TextDecoder("utf-8").decode(inflated);
			if (looksLikeXml(inflatedText)) {
				return inflatedText;
			}

			try {
				return grasshopperBinaryToXml(inflated);
			} catch (err) {
				throw new GhFileError(
					`Failed to decode "${file.name}" as a native Grasshopper .gh archive: ${
						err instanceof Error ? err.message : String(err)
					}`,
					kind
				);
			}
		}
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

	return decodeUtf8(xmlBytes, file.name, kind);
}

/**
 * Convenience: build the app's legacy gzip-compressed XML `.gh` blob from raw
 * GhXml. Native Grasshopper `.gh` files use a different binary archive format;
 * this helper is kept for existing tests and app-generated download flows.
 */
export function ghXmlToGhFile(xml: string, filename = "definition.gh"): Blob {
	const gzipped = pako.gzip(xml);
	return new Blob([gzipped as Uint8Array<ArrayBuffer>], {
		type: "application/octet-stream",
	});
}
