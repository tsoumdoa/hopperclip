import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { seedHeat } from "./ranking";

export const backfill = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, { cursor }) => {
		const result = await ctx.db
			.query("post")
			.paginate({ cursor: cursor ?? null, numItems: 100 });
		for (const post of result.page) {
			if (post.rankScore !== undefined) continue;
			const heat = seedHeat(post);
			await ctx.db.patch(post._id, {
				heat,
				rankScore: heat,
				usageCount: post.usageCount ?? 0,
			});
		}
		if (!result.isDone)
			await ctx.scheduler.runAfter(0, internal.rankingBackfill.backfill, {
				cursor: result.continueCursor,
			});
	},
});
