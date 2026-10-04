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
	{ minutes: 5 },
	internal.storage.sweep
);

crons.interval(
	"prune expired access limits",
	{ minutes: 10 },
	internal.shareAccess.pruneExpiredLimits
);

export default crons;
