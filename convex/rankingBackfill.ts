import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { activeShareExpiry } from "./ghCard";
import { seedHeat } from "./ranking";

const SETTLE_BATCH_SIZE = 200;

export const sharesBackfill = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, { cursor }) => {
		const result = await ctx.db
			.query("shares")
			.paginate({ cursor: cursor ?? null, numItems: 100 });
		for (const share of result.page) {
			const post = await ctx.db.get(share.postId);
			if (!post) continue;
			const expiry = await activeShareExpiry(ctx, share.postId);
			if (post.activeShareExpiresAt !== expiry)
				await ctx.db.patch(post._id, { activeShareExpiresAt: expiry });
		}
		if (!result.isDone)
			await ctx.scheduler.runAfter(0, internal.rankingBackfill.sharesBackfill, {
				cursor: result.continueCursor,
			});
	},
});

export const settleRankScores = internalMutation({
	args: {},
	handler: async (ctx) => {
		const uninitialized = await ctx.db
			.query("post")
			.withIndex("by_rankScore", (q) => q.eq("rankScore", undefined))
			.take(SETTLE_BATCH_SIZE);
		for (const post of uninitialized) {
			const heat = seedHeat(post);
			await ctx.db.patch(post._id, {
				heat,
				rankScore: heat,
				usageCount: post.usageCount ?? 0,
				rankDirty: undefined,
			});
		}
		const posts = await ctx.db
			.query("post")
			.withIndex("by_rankDirty", (q) => q.eq("rankDirty", true))
			.take(SETTLE_BATCH_SIZE);
		for (const post of posts)
			await ctx.db.patch(post._id, {
				rankScore: seedHeat(post),
				rankDirty: undefined,
			});
		if (
			uninitialized.length === SETTLE_BATCH_SIZE ||
			posts.length === SETTLE_BATCH_SIZE
		)
			await ctx.scheduler.runAfter(
				0,
				internal.rankingBackfill.settleRankScores,
				{}
			);
	},
});
