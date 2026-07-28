import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
	GhCardSchema,
	ShareLinkUidSchema,
	StorageKeySchema,
	UserTag,
	SortOrder,
} from "../src/types/types";
import { generateSharableLinkUid } from "../src/utils/generage-shareable-link-uid";

const DEFAULT_SHARE_EXPIRY_HOURS = 24 * 7;
const MAX_SHARE_EXPIRY_HOURS = 24 * 30;

function validateStorageKey(uid: string) {
	const parsed = StorageKeySchema.safeParse(uid);
	if (!parsed.success) {
		throw new Error("Invalid storage key");
	}
	return parsed.data;
}

function validateShareToken(shareToken: string) {
	const parsed = ShareLinkUidSchema.safeParse(shareToken);
	if (!parsed.success) {
		throw new Error("Invalid share token");
	}
	return parsed.data;
}

export const addPost = mutation({
	args: {
		name: v.string(),
		description: v.string(),
		tags: v.array(v.string()),
		uid: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}
		GhCardSchema.parse({
			name: args.name,
			description: args.description,
			tags: args.tags,
		});
		const bucketUrl = validateStorageKey(args.uid);
		await ctx.db.insert("post", {
			name: args.name,
			description: args.description,
			tags: args.tags,
			clerkUserId: identity.id as string,
			bucketUrl,
			dateCreated: new Date().toISOString(),
			dateUpdated: new Date().toISOString(),
		});
	},
});

export const deletePost = mutation({
	args: {
		id: v.id("post"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}
		const post = await ctx.db.get(args.id);
		if (!post) {
			throw new Error("Post not found");
		}
		if (post.clerkUserId !== identity.id) {
			throw new Error("Not authorized to delete this post");
		}

		const shares = await ctx.db
			.query("shares")
			.withIndex("by_postId", (q) => q.eq("postId", args.id))
			.collect();

		for (const share of shares) {
			await ctx.db.delete(share._id);
		}

		await ctx.db.delete(args.id);
	},
});

export const updatePost = mutation({
	args: {
		id: v.id("post"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		uid: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}
		const post = await ctx.db.get(args.id);
		if (!post) {
			throw new Error("Post not found");
		}
		if (post.clerkUserId !== identity.id) {
			throw new Error("Not authorized to update this post");
		}
		GhCardSchema.partial().parse({
			name: args.name,
			description: args.description,
			tags: args.tags,
		});
		if (args.uid !== undefined && args.uid !== null) {
			const bucketUrl = validateStorageKey(args.uid);
			await ctx.db.patch("post", args.id, {
				name: args.name,
				description: args.description,
				tags: args.tags,
				dateUpdated: new Date().toISOString(),
				bucketUrl,
			});
		} else {
			await ctx.db.patch("post", args.id, {
				name: args.name,
				description: args.description,
				tags: args.tags,
				dateUpdated: new Date().toISOString(),
			});
		}
	},
});

export const getAll = query({
	args: {
		tags: v.optional(v.array(v.string())),
		sortOrder: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const tags = args.tags ?? [];
		const sortOrder = args.sortOrder || "descLastEdited";

		if (tags.length === 0 && sortOrder === "ascLastEdited") {
			return await ctx.db
				.query("post")
				.withIndex("by_clerkUserId", (q) =>
					q.eq("clerkUserId", identity.id as string)
				)
				.order("desc")
				.collect();
		}

		let posts;
		switch (sortOrder as SortOrder) {
			case "ascAZ":
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_name", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("asc")
					.collect();
				break;

			case "descZA":
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_name", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("desc")
					.collect();
				break;

			case "ascLastEdited":
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_dateUpdated", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("desc")
					.collect();
				break;

			case "descLastEdited":
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_dateUpdated", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("asc")
					.collect();
				break;

			case "ascCreated":
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_dateCreated", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("desc")
					.collect();
				break;

			case "descCreated":
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_dateCreated", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("asc")
					.collect();
				break;

			default:
				posts = await ctx.db
					.query("post")
					.withIndex("by_user_name", (q) =>
						q.eq("clerkUserId", identity.id as string)
					)
					.order("asc")
					.collect();
				break;
		}

		if (tags.length === 0) return posts;

		return posts.filter((post) => {
			for (const tag of tags) {
				if (post.tags?.includes(tag)) {
					return true;
				}
			}
		});
	},
});

export const getUserTags = query({
	args: {},
	handler: async (ctx, _) => {
		try {
			const identity = await ctx.auth.getUserIdentity();
			if (identity === null) {
				throw new Error("Not authenticated");
			}
			const posts = await ctx.db
				.query("post")
				.withIndex("by_clerkUserId", (q) =>
					q.eq("clerkUserId", identity.id as string)
				)
				.collect();

			const counts = posts
				.flatMap((p) => p.tags ?? [])
				.reduce<Record<string, number>>((acc, tag) => {
					acc[tag] = (acc[tag] ?? 0) + 1;
					return acc;
				}, {});

			const userTags: UserTag[] = Object.entries(counts).map(
				([tag, count]) => ({
					tag,
					count,
				})
			);
			userTags.sort((a, b) => {
				if (a.tag < b.tag) return -1;
				if (a.tag > b.tag) return 1;
				return 0;
			});
			return userTags;
		} catch (err) {
			console.error("getUserTags error:", err);
			throw err;
		}
	},
});

// Create a new share link for a post
export const createShare = mutation({
	args: {
		postId: v.id("post"),
		expiresInHours: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		// Verify the post exists and belongs to the user
		const post = await ctx.db.get(args.postId);
		if (!post) {
			throw new Error("Post not found");
		}
		if (post.clerkUserId !== identity.id) {
			throw new Error("Not authorized to share this post");
		}

		// Check if there's already an active share for this post
		const existingShares = await ctx.db
			.query("shares")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.collect();

		const now = new Date();
		const activeShare = existingShares.find(
			(share) => new Date(share.expiryDate) > now
		);

		if (activeShare) {
			// Return existing active share
			return {
				shareToken: activeShare.shareToken,
				expiryDate: activeShare.expiryDate,
				isExisting: true,
			};
		}

		const shareToken = generateSharableLinkUid();

		const expiresInHours = args.expiresInHours ?? DEFAULT_SHARE_EXPIRY_HOURS;
		if (expiresInHours < 1 || expiresInHours > MAX_SHARE_EXPIRY_HOURS) {
			throw new Error("Share expiry must be between 1 hour and 30 days");
		}
		const expiresInMs = expiresInHours * 60 * 60 * 1000;
		const expiryDate = new Date(now.getTime() + expiresInMs);

		// Create the share record
		await ctx.db.insert("shares", {
			postId: args.postId,
			shareToken,
			expiryDate: expiryDate.toISOString(),
			createdAt: now.toISOString(),
			clerkUserId: identity.id as string,
		});

		return {
			shareToken,
			expiryDate: expiryDate.toISOString(),
			isExisting: false,
		};
	},
});

// Revoke (delete) a share by token
export const revokeShare = mutation({
	args: {
		shareToken: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}
		const shareToken = validateShareToken(args.shareToken);

		const share = await ctx.db
			.query("shares")
			.withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
			.first();

		if (!share) {
			throw new Error("Share not found");
		}

		if (share.clerkUserId !== identity.id) {
			throw new Error("Not authorized to revoke this share");
		}

		await ctx.db.delete(share._id);
		return { success: true };
	},
});

// Get active shares for a post
export const getActiveSharesForPost = query({
	args: {
		postId: v.id("post"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}
		const post = await ctx.db.get(args.postId);
		if (!post) {
			return [];
		}
		if (post.clerkUserId !== identity.id) {
			throw new Error("Not authorized to view shares for this post");
		}

		const shares = await ctx.db
			.query("shares")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.collect();

		const now = new Date();
		return shares
			.filter((share) => new Date(share.expiryDate) > now)
			.map((share) => ({
				shareToken: share.shareToken,
				expiryDate: share.expiryDate,
				createdAt: share.createdAt,
			}));
	},
});

// Public query to get a shared post (no authentication required)
export const getSharedPost = query({
	args: {
		shareToken: v.string(),
	},
	handler: async (ctx, args) => {
		const shareToken = validateShareToken(args.shareToken);
		const share = await ctx.db
			.query("shares")
			.withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
			.first();

		if (!share) {
			return null;
		}

		const now = new Date();
		if (new Date(share.expiryDate) <= now) {
			// Share has expired - return null (DB cleanup via daily cron in crons.ts)
			return null;
		}

		const post = await ctx.db.get(share.postId);
		if (!post) {
			return null;
		}

		return {
			post: {
				name: post.name,
				description: post.description,
				tags: post.tags,
			},
			sharedToken: share.shareToken,
			expiryDate: share.expiryDate,
			shareToken: share.shareToken,
		};
	},
});

// Delete all shares for a post (useful when post is deleted)
export const deleteSharesByPost = mutation({
	args: {
		postId: v.id("post"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const post = await ctx.db.get(args.postId);
		if (!post || post.clerkUserId !== identity.id) {
			throw new Error("Not authorized");
		}

		const shares = await ctx.db
			.query("shares")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.collect();

		for (const share of shares) {
			await ctx.db.delete(share._id);
		}

		return { deletedCount: shares.length };
	},
});
