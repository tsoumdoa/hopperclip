import { MAX_COMPRESSED_GH_XML_BYTES, StorageKeySchema } from "@/types/types";

export class UploadError extends Error {}

export async function uploadCompressedXml(
	bytes: Uint8Array<ArrayBuffer>,
	signal?: AbortSignal
): Promise<string> {
	if (
		bytes.byteLength === 0 ||
		bytes.byteLength > MAX_COMPRESSED_GH_XML_BYTES
	) {
		throw new UploadError("Compressed XML must be between 1 byte and 25 MiB");
	}
	const response = await fetch("/api/uploads", {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/gzip" },
		body: bytes,
		signal,
	});
	if (!response.ok) {
		throw new UploadError(
			response.status === 429
				? "Too many uploads. Wait a moment and try again."
				: response.status === 413
					? "Upload exceeds the server's size limit. Try a smaller file."
					: "Upload failed. Please try again."
		);
	}
	const result: unknown = await response.json();
	if (typeof result !== "object" || result === null || !("key" in result)) {
		throw new Error("Upload returned an invalid storage key");
	}
	return StorageKeySchema.parse(result.key);
}
