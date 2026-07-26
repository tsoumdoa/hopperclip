import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";
import { decompress } from "./gzip";
import {
	GhSizeError,
	grasshopperBinaryToXml,
	inflateGrasshopperBinary,
} from "./gh-binary";
import { normalizeGhXmlForClipboard } from "./gh-xml";

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

function assertValidFileBuffer(buffer: ArrayBuffer, filename: string) {
	if (buffer.byteLength === 0) {
		throw new GhFileError(`File "${filename}" is empty.`, "empty");
	}

	if (buffer.byteLength > MAX_COMPRESSED_GH_XML_BYTES) {
		throw new GhFileError(`File "${filename}" is too large.`, "too-large");
	}
}

async function decompressGhBytes(buffer: ArrayBuffer, filename: string) {
	try {
		return await decompress(buffer);
	} catch (err) {
		if (err instanceof GhSizeError) {
			throw new GhFileError(err.message, "too-large");
		}
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("too large")) {
			throw new GhFileError(message, "too-large");
		}
		throw new GhFileError(`Failed to decode "${filename}": ${message}`, "gh");
	}
}

async function decodeGhFile(buffer: ArrayBuffer, filename: string) {
	const bytes = await decompressGhBytes(buffer, filename);
	const plainText = new TextDecoder("utf-8").decode(bytes);
	if (looksLikeXml(plainText)) {
		return decodeUtf8(bytes, filename, "gh");
	}

	let inflated: Uint8Array;
	try {
		inflated = inflateGrasshopperBinary(bytes.buffer as ArrayBuffer);
	} catch (err) {
		if (err instanceof GhSizeError) {
			throw new GhFileError(err.message, "too-large");
		}
		return plainText;
	}

	const inflatedText = new TextDecoder("utf-8").decode(inflated);
	if (looksLikeXml(inflatedText)) {
		return decodeUtf8(inflated, filename, "gh");
	}

	try {
		return grasshopperBinaryToXml(inflated);
	} catch (err) {
		if (err instanceof GhSizeError) {
			throw new GhFileError(err.message, "too-large");
		}
		throw new GhFileError(
			`Failed to decode "${filename}" as a native Grasshopper .gh archive: ${
				err instanceof Error ? err.message : String(err)
			}`,
			"gh"
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
	assertValidFileBuffer(buffer, file.name);

	const view = new Uint8Array(buffer);
	if (kind === "ghx") {
		return normalizeGhXmlForClipboard(decodeUtf8(view, file.name, kind));
	}

	return normalizeGhXmlForClipboard(await decodeGhFile(buffer, file.name));
}
