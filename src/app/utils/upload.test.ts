import { afterEach, expect, test, vi } from "vitest";
import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";
import { uploadCompressedXml } from "./upload";

afterEach(() => vi.unstubAllGlobals());

test("uploads the byte view directly and returns the server-issued key", async () => {
	const fetch = vi.fn<typeof globalThis.fetch>(async () =>
		Response.json({ key: "server-issued-key" })
	);
	vi.stubGlobal("fetch", fetch);
	const bytes = new Uint8Array([31, 139, 8]);
	const signal = new AbortController().signal;
	expect(await uploadCompressedXml(bytes, signal)).toBe("server-issued-key");
	expect(fetch).toHaveBeenCalledWith("/api/uploads", {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/gzip" },
		body: bytes,
		signal,
	});
	expect(fetch.mock.calls[0][1]?.body).toBe(bytes);
});

test("blocks oversized compressed data before sending it", async () => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	await expect(
		uploadCompressedXml(new Uint8Array(MAX_COMPRESSED_GH_XML_BYTES + 1))
	).rejects.toThrow("25 MiB");
	expect(fetch).not.toHaveBeenCalled();
});

test("shows a useful message when uploads are rate limited", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => new Response(null, { status: 429 }))
	);
	await expect(uploadCompressedXml(new Uint8Array([1]))).rejects.toThrow(
		"Too many uploads"
	);
});

test("does not assume a hosting provider's smaller upload limit is 25 MiB", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => new Response(null, { status: 413 }))
	);
	await expect(uploadCompressedXml(new Uint8Array([1]))).rejects.toThrow(
		"Upload exceeds the server's size limit. Try a smaller file."
	);
});

test.each([{ key: "../private" }, {}, null])(
	"rejects an invalid upload response: %j",
	async (result) => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json(result))
		);
		await expect(uploadCompressedXml(new Uint8Array([1]))).rejects.toThrow();
	}
);
