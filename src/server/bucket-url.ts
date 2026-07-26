import { env } from "@/env";

/**
 * Builds the R2 object URL for a user's stored definition. Server-only.
 *
 * Convex keeps its own copy in `convex/bucketUrl.ts` — it runs in a different
 * runtime and should not import across the workspace boundary.
 */
export const bucketUrl = (userId: string, bucketKey: string) =>
	`${env.R2_URL}/${userId}/${bucketKey}`;
