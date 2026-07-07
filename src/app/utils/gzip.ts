import pako from "pako";
import { MAX_DECOMPRESSED_GH_XML_BYTES } from "@/types/types";

export const compress = (data: string) => {
	const gziped = pako.gzip(data);
	return gziped as Uint8Array<ArrayBuffer>;
};

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
	const decompressed = await new Response(stream).arrayBuffer();
	if (decompressed.byteLength > maxBytes) {
		throw new Error("GhXml is too large");
	}
	return new Uint8Array(decompressed);
};
