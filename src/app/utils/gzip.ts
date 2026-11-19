import { gzip } from "pako";
import {
	MAX_COMPRESSED_GH_XML_BYTES,
	MAX_DECOMPRESSED_GH_XML_BYTES,
} from "@/types/types";

export const compress = (data: string) => gzip(data);

export const decompress = async (
	data: ArrayBuffer,
	maxBytes = MAX_DECOMPRESSED_GH_XML_BYTES
): Promise<Uint8Array> => {
	//check if it's already decompressed
	const view = new Uint8Array(data);
	const isGzipped = view[0] === 0x1f && view[1] === 0x8b;
	if (!isGzipped) {
		if (view.byteLength > maxBytes) {
			throw new Error("GhXml is too large");
		}
		return view;
	}

	const stream = new Response(data).body!.pipeThrough(
		new DecompressionStream("gzip")
	);
	return readBoundedGhBytes(stream, maxBytes);
};

export async function readGhDownload(response: Response): Promise<ArrayBuffer> {
	if (!response.body) throw new Error("GhXml download is empty");
	const bytes = await readBoundedGhBytes(
		response.body,
		MAX_COMPRESSED_GH_XML_BYTES
	);
	return bytes.buffer;
}

async function readBoundedGhBytes(
	stream: ReadableStream<Uint8Array>,
	maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
	const reader = stream.getReader();
	let bytes = new Uint8Array(0);
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value.byteLength === 0) continue;
			const nextTotal = total + value.byteLength;
			if (nextTotal > maxBytes) {
				void reader.cancel().catch(() => {});
				throw new Error("GhXml is too large");
			}
			if (nextTotal > bytes.byteLength) {
				const capacity = Math.min(
					maxBytes,
					Math.max(64 * 1024, bytes.byteLength * 2, nextTotal)
				);
				const grown = new Uint8Array(capacity);
				grown.set(bytes.subarray(0, total));
				bytes = grown;
			}
			bytes.set(value, total);
			total = nextTotal;
		}
	} finally {
		reader.releaseLock();
	}
	return total === bytes.byteLength ? bytes : bytes.slice(0, total);
}
