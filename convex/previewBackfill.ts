import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { StorageKeySchema } from "../src/types/types";
import { PREVIEW_VERSION } from "../src/types/preview";
import { previewDataValidator } from "./previewData";
import { savePreviewForUser } from "./previews";

// Keep sequential downloads comfortably within the action time limit, even if
// every request reaches its 30-second deadline.
const PAGE_SIZE = 10;

export const listMissing = internalQuery({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, { cursor }) => {
		const result = await ctx.db.query("post").paginate({
			cursor: cursor ?? null,
			numItems: PAGE_SIZE,
		});
		const entries: Array<{ clerkUserId: string; bucketUrl: string }> = [];
		const seen = new Set<string>();
		for (const post of result.page) {
			if (
				!post.clerkUserId ||
				!StorageKeySchema.safeParse(post.bucketUrl).success
			)
				continue;
			const key = JSON.stringify([post.clerkUserId, post.bucketUrl]);
			if (seen.has(key)) continue;
			seen.add(key);
			const preview = await ctx.db
				.query("postPreviews")
				.withIndex("by_user_key", (q) =>
					q
						.eq("clerkUserId", post.clerkUserId!)
						.eq("storageKey", post.bucketUrl)
				)
				.unique();
			if (preview?.version !== PREVIEW_VERSION)
				entries.push({
					clerkUserId: post.clerkUserId,
					bucketUrl: post.bucketUrl,
				});
		}
		return {
			entries,
			continueCursor: result.continueCursor,
			isDone: result.isDone,
		};
	},
});

export const savePreviewInternal = internalMutation({
	args: {
		clerkUserId: v.string(),
		storageKey: v.string(),
		version: v.number(),
		data: previewDataValidator,
	},
	handler: savePreviewForUser,
});
