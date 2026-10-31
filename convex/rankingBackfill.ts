import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { addEvent, weights } from "./ranking";

export const backfill = internalMutation({
	args: { cursor: v.optional(v.union(v.string(), v.null())) },
	handler: async (ctx, { cursor }) => {
		const result = await ctx.db
			.query("post")
			.paginate({ cursor: cursor ?? null, numItems: 100 });
		for (const post of result.page) {
			if (post.heat !== undefined) continue;
			const created = Date.parse(post.dateCreated);
			const updated = Date.parse(post.dateUpdated);
			let heat = addEvent(undefined, weights.created, created);
			if (Math.abs(updated - created) > 1000)
				heat = addEvent(heat, weights.modified, updated);
			await ctx.db.patch(post._id, { heat, rankScore: heat, usageCount: 0 });
		}
		if (!result.isDone)
			await ctx.scheduler.runAfter(0, internal.rankingBackfill.backfill, {
				cursor: result.continueCursor,
			});
	},
});
