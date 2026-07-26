/**
 * Local copy of the R2 object-URL builder.
 *
 * Deliberately duplicated rather than imported from `src/`: Convex functions
 * run in their own runtime with their own environment, and reaching up into the
 * app's source tree for four lines is a worse coupling than the duplication.
 * Keep in sync with `src/server/bucket-url.ts`.
 */
export const bucketUrl = (userId: string, bucketKey: string) =>
	`${process.env.R2_URL!}/${userId}/${bucketKey}`;
