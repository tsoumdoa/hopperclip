import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const CLEANUP_BATCH_SIZE = 100;
/** Space follow-up batches so cleanup does not hammer the DB. */
const CLEANUP_BATCH_DELAY_MS = 60_000;

/**
 * Delete expired share rows in batches.
 * Daily cron kicks this off; if a full batch is deleted, another run is
 * scheduled after a short delay so backlogs cannot grow unbounded.
 */
export const cleanupExpiredShares = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = new Date().toISOString();
		const expired = await ctx.db
			.query("shares")
			.withIndex("by_expiryDate", (q) => q.lt("expiryDate", now))
			.take(CLEANUP_BATCH_SIZE);
		for (const share of expired) {
			await ctx.db.delete(share._id);
		}
		if (expired.length === CLEANUP_BATCH_SIZE) {
			await ctx.scheduler.runAfter(
				CLEANUP_BATCH_DELAY_MS,
				internal.ghInternalMutation.cleanupExpiredShares,
				{}
			);
		}
		return { deleted: expired.length };
	},
});
