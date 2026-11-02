"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { PREVIEW_VERSION } from "../src/types/preview";
import {
	MAX_BACKFILL_COMPRESSED_BYTES,
	previewFromBytes,
} from "./previewBackfillData";
import { storageGet } from "./storageR2";

export const run = internalAction({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, { cursor }): Promise<void> => {
		const batch = await ctx.runQuery(internal.previewBackfill.listMissing, {
			cursor,
		});
		let saved = 0,
			skipped = 0,
			failed = 0;
		for (const { clerkUserId, bucketUrl } of batch.entries) {
			try {
				const bytes = await storageGet(
					clerkUserId,
					bucketUrl,
					MAX_BACKFILL_COMPRESSED_BYTES
				);
				const data = bytes && (await previewFromBytes(bytes));
				if (!data) {
					skipped++;
					continue;
				}
				const changed = await ctx.runMutation(
					internal.previewBackfill.savePreviewInternal,
					{
						clerkUserId,
						storageKey: bucketUrl,
						version: PREVIEW_VERSION,
						data,
					}
				);
				if (changed) saved++;
				else skipped++;
			} catch (error) {
				failed++;
				console.warn(
					"Preview backfill item failed",
					clerkUserId,
					bucketUrl,
					error instanceof Error ? error.message : "Unknown error"
				);
			}
		}
		console.log(
			`Preview backfill: processed=${batch.entries.length} saved=${saved} skipped=${skipped} failed=${failed} done=${batch.isDone} nextCursor=${batch.continueCursor}`
		);
		if (!batch.isDone)
			await ctx.scheduler.runAfter(0, internal.previewBackfillNode.run, {
				cursor: batch.continueCursor,
			});
	},
});
