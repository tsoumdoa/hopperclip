import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"cleanup expired shares",
	{ hourUTC: 4, minuteUTC: 0 },
	internal.ghInternalMutation.cleanupExpiredShares
);

export default crons;
