import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { enqueueUnreferencedObject } from "./storageLifecycle";

// Authorization belongs to the caller. All detach/cascade writes share its
// transaction, including preview data and backfill claims on the last reference.
export async function deletePostAndReferences(
	ctx: MutationCtx,
	post: Doc<"post">
) {
	const shares = await ctx.db
		.query("shares")
		.withIndex("by_postId", (q) => q.eq("postId", post._id))
		.collect();
	for (const share of shares) await ctx.db.delete(share._id);
	await ctx.db.delete(post._id);
	if (post.clerkUserId) {
		await enqueueUnreferencedObject(ctx, post.clerkUserId, post.bucketUrl);
	}
}
