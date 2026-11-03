"use node";

import { v } from "convex/values";
import { XMLValidator } from "fast-xml-parser";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { PREVIEW_VERSION, type PreviewData } from "../src/types/preview";
import { StorageKeySchema } from "../src/types/types";
import { buildGhJson } from "../parser/src/parser";
import { buildPreview } from "../src/app/lib/build-preview";
import { validatePreview } from "./previewData";
import { storageGet, StorageConfigurationError } from "./storageR2";

export const MAX_BACKFILL_XML_BYTES = 12 * 1024 * 1024;
// ~1.1M tiny tags in 11.5 MiB XML reached ~550 MiB RSS; real all.xml's
// ~305k tags reached ~222 MiB. Bound structure before parsing in a 512 MiB action.
export const MAX_BACKFILL_XML_TAGS = 400_000;

function isGzipError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const hasZlibCode = (value: object) =>
		"code" in value &&
		typeof value.code === "string" &&
		value.code.startsWith("Z_");
	return (
		hasZlibCode(error) ||
		("cause" in error &&
			typeof error.cause === "object" &&
			error.cause !== null &&
			hasZlibCode(error.cause))
	);
}

// Sniff bytes rather than headers: Node fetch may already have decoded gzip,
// while retaining the stored Content-Encoding and Content-Length headers.
export async function readXmlBytes(
	response: Response
): Promise<Uint8Array | string> {
	if (!response.body) return "skipped:not-xml";
	const source = response.body.getReader();
	let sourceFailed = false;
	let output: ReadableStreamDefaultReader<Uint8Array> | undefined;
	try {
		const prefix: Uint8Array<ArrayBuffer>[] = [];
		let prefixSize = 0;
		while (prefixSize < 2) {
			const { done, value } = await source.read();
			if (done) break;
			prefix.push(value);
			prefixSize += value.byteLength;
		}
		const magic = prefix
			.flatMap((chunk) => Array.from(chunk.subarray(0, 2)))
			.slice(0, 2);
		const gzip = magic[0] === 0x1f && magic[1] === 0x8b;
		const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
			start(controller) {
				for (const chunk of prefix) controller.enqueue(chunk);
			},
			async pull(controller) {
				try {
					const { done, value } = await source.read();
					if (done) controller.close();
					else controller.enqueue(value);
				} catch (error) {
					sourceFailed = true;
					controller.error(error);
				}
			},
			cancel: () => source.cancel(),
		});
		output = (
			gzip ? stream.pipeThrough(new DecompressionStream("gzip")) : stream
		).getReader();
		const chunks: Uint8Array[] = [];
		let size = 0;
		try {
			for (;;) {
				const { done, value } = await output.read();
				if (done) break;
				size += value.byteLength;
				if (size > MAX_BACKFILL_XML_BYTES) return "skipped:too-large";
				chunks.push(value);
			}
		} catch (error) {
			if (sourceFailed && !isGzipError(error)) throw error;
			return "skipped:invalid-gzip";
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return bytes;
	} catch (error) {
		if (isGzipError(error)) return "skipped:invalid-gzip";
		throw error;
	} finally {
		await output?.cancel().catch(() => {});
		output?.releaseLock();
		await source.cancel().catch(() => {});
		source.releaseLock();
	}
}

export async function previewFromResponse(
	response: Response
): Promise<PreviewData | string> {
	if (!response.ok) {
		if (response.status === 429 || response.status >= 500)
			throw new Error(`Storage GET failed: ${response.status}`);
		return `skipped:http-${response.status}`;
	}
	const bytes = await readXmlBytes(response);
	if (typeof bytes === "string") return bytes;
	let xml: string;
	try {
		xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return "skipped:not-xml";
	}
	if (!xml.trimStart().startsWith("<")) return "skipped:not-xml";
	let tags = 0;
	for (let i = xml.indexOf("<"); i !== -1; i = xml.indexOf("<", i + 1)) {
		if (++tags > MAX_BACKFILL_XML_TAGS) return "skipped:too-complex";
	}
	let parsed: ReturnType<typeof buildGhJson>;
	try {
		if (XMLValidator.validate(xml) !== true) return "skipped:parse-error";
		parsed = buildGhJson(xml, { includeVisuals: true });
	} catch {
		return "skipped:parse-error";
	}
	try {
		const data = buildPreview(parsed);
		validatePreview(data);
		return data;
	} catch {
		return "skipped:build-error";
	}
}

export const buildOne = internalAction({
	args: { clerkUserId: v.string(), storageKey: v.string() },
	handler: async (ctx, args): Promise<string> => {
		const report = (status: string) => {
			console.log(
				"Preview backfill",
				args.clerkUserId,
				args.storageKey,
				status
			);
			return status;
		};
		if (
			!/^[A-Za-z0-9_-]+$/.test(args.clerkUserId) ||
			!StorageKeySchema.safeParse(args.storageKey).success
		)
			return report("skipped:invalid-key-or-owner");
		const state = await ctx.runQuery(internal.previewBackfill.getState, args);
		if (state === "missing") return report("skipped:post-gone");
		if (state === "current") return report("unchanged");
		let data: PreviewData | string;
		try {
			data = await storageGet(
				args.clerkUserId,
				args.storageKey,
				previewFromResponse
			);
		} catch (error) {
			if (error instanceof StorageConfigurationError)
				return report("skipped:storage-unconfigured");
			// Do not leak signed URLs or credentials through Workpool's error logs.
			throw new Error("Preview backfill download failed");
		}
		if (typeof data === "string") return report(data);
		const changed = await ctx.runMutation(
			internal.previewBackfill.savePreviewInternal,
			{
				...args,
				version: PREVIEW_VERSION,
				data,
			}
		);
		return report(
			changed === null ? "skipped:post-gone" : changed ? "saved" : "unchanged"
		);
	},
});
