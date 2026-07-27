import { internalMutation } from "./_generated/server";

/** Delete expired share rows in batches (driven by daily cron). */
export const cleanupExpiredShares = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = new Date().toISOString();
		const expired = await ctx.db
			.query("shares")
			.withIndex("by_expiryDate", (q) => q.lt("expiryDate", now))
			.take(100);
		for (const share of expired) {
			await ctx.db.delete(share._id);
		}
		return { deleted: expired.length };
	},
});
