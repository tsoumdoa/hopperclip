import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"cleanup expired shares",
	{ hourUTC: 4, minuteUTC: 0 },
	internal.ghInternalMutation.cleanupExpiredShares
);

crons.interval(
	"recover storage cleanup and abandoned uploads",
	{ minutes: 30 },
	internal.storage.sweep
);

crons.interval(
	"prune expired access limits",
	{ minutes: 60 },
	internal.shareAccess.pruneExpiredLimits
);

crons.interval(
	"settle library ranking",
	{ hours: 12 },
	internal.rankingBackfill.settleRankScores
);

crons.weekly(
	"reconcile cards with missing storage",
	{ dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 17 },
	internal.storageReconcile.run,
	{ mode: "apply" }
);

export default crons;
