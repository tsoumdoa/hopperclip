import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { bucketUrl } from "./bucketUrl";
import { ShareLinkUidSchema, StorageKeySchema } from "../src/types/types";

export const getShareableLink = internalQuery({
	args: {
		shareToken: v.string(),
	},
	handler: async (ctx, args) => {
		const shareToken = ShareLinkUidSchema.safeParse(args.shareToken);
		if (!shareToken.success) return null;

		const share = await ctx.db
			.query("shares")
			.withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken.data))
			.first();
		if (!share) return null;
		if (new Date(share.expiryDate) <= new Date()) return null;
		const post = await ctx.db.get(share.postId);

		if (!post) return null;
		if (post.clerkUserId !== share.clerkUserId) return null;

		const storageKey = StorageKeySchema.safeParse(post.bucketUrl);
		if (!storageKey.success) return null;

		return bucketUrl(share.clerkUserId, storageKey.data);
	},
});
