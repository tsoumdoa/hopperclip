import { addEvent, seedHeat, USAGE_DEBOUNCE_MS, weights } from "./ranking";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { SortOrder } from "../src/types/types";
import { paginationOptsValidator } from "convex/server";
import { filter } from "convex-helpers/server/filter";
import { v } from "convex/values";
import {
	GhCardSchema,
	ShareLinkUidSchema,
	StorageKeySchema,
	UserTag,
	SortOrderZenum,
	DEFAULT_SORT_ORDER,
	normalizeSortOrder,
} from "../src/types/types";
import { generateSharableLinkUid } from "../src/utils/generage-shareable-link-uid";
import {
	attachUploadedObject,
	enqueueUnreferencedObject,
} from "./storageLifecycle";

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
		if (identity === null || typeof identity.id !== "string") {
			throw new Error("Not authenticated");
		}
		GhCardSchema.parse({
			name: args.name,
			description: args.description,
			tags: args.tags,
		});
		const bucketUrl = validateStorageKey(args.uid);
		await attachUploadedObject(ctx, identity.id, bucketUrl);
		const nowMs = Date.now();
		const now = new Date(nowMs).toISOString();
		const heat = addEvent(undefined, weights.created, nowMs);
		await ctx.db.insert("post", {
			name: args.name,
			description: args.description,
			tags: [...new Set(args.tags)],
			clerkUserId: identity.id,
			bucketUrl,
			usageCount: 0,
			heat,
			rankScore: heat,
			dateCreated: now,
			dateUpdated: now,
		});
	},
});

export const deletePost = mutation({
	args: {
		id: v.id("post"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || typeof identity.id !== "string") {
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
		await enqueueUnreferencedObject(ctx, post.clerkUserId, post.bucketUrl);
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
		if (identity === null || typeof identity.id !== "string") {
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
		const nowMs = Date.now();
		const patch = {
			...(args.name !== undefined && { name: args.name }),
			...(args.description !== undefined && { description: args.description }),
			...(args.tags !== undefined && { tags: [...new Set(args.tags)] }),
			dateUpdated: new Date(nowMs).toISOString(),
			heat: addEvent(seedHeat(post), weights.modified, nowMs),
			rankDirty: true,
		};
		const bucketUrl =
			args.uid == null ? post.bucketUrl : validateStorageKey(args.uid);
		const replacing = bucketUrl !== post.bucketUrl;
		if (replacing) {
			await attachUploadedObject(ctx, post.clerkUserId, bucketUrl);
		}
		await ctx.db.patch("post", args.id, {
			...patch,
			...(replacing && { bucketUrl }),
		});
		if (replacing) {
			await enqueueUnreferencedObject(ctx, post.clerkUserId, post.bucketUrl);
		}
	},
});

function sortedPosts(ctx: QueryCtx, userId: string, sortOrder: SortOrder) {
	switch (sortOrder) {
		case "ascAZ":
			return ctx.db
				.query("post")
				.withIndex("by_user_name", (q) => q.eq("clerkUserId", userId))
				.order("asc");

		case "descZA":
			return ctx.db
				.query("post")
				.withIndex("by_user_name", (q) => q.eq("clerkUserId", userId))
				.order("desc");

		case "lastEditedNewest":
			return ctx.db
				.query("post")
				.withIndex("by_user_dateUpdated", (q) => q.eq("clerkUserId", userId))
				.order("desc");

		case "lastEditedOldest":
			return ctx.db
				.query("post")
				.withIndex("by_user_dateUpdated", (q) => q.eq("clerkUserId", userId))
				.order("asc");

		case "createdNewest":
			return ctx.db
				.query("post")
				.withIndex("by_user_dateCreated", (q) => q.eq("clerkUserId", userId))
				.order("desc");

		case "createdOldest":
			return ctx.db
				.query("post")
				.withIndex("by_user_dateCreated", (q) => q.eq("clerkUserId", userId))
				.order("asc");

		default: {
			const _exhaustive: never = sortOrder;
			throw new Error(`Unhandled sortOrder: ${_exhaustive}`);
		}
	}
}

export const getAll = query({
	args: {
		tags: v.optional(v.array(v.string())),
		sortOrder: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || typeof identity.id !== "string") {
			throw new Error("Not authenticated");
		}

		const userId = identity.id;
		const tags = args.tags ?? [];
		const sortOrder = SortOrderZenum.parse(
			normalizeSortOrder(args.sortOrder ?? DEFAULT_SORT_ORDER)
		);

		const posts = await sortedPosts(ctx, userId, sortOrder).collect();

		if (tags.length === 0) return posts;

		return posts.filter((post) => tags.some((tag) => post.tags?.includes(tag)));
	},
});

export const listPage = query({
	args: {
		paginationOpts: paginationOptsValidator,
		sortOrder: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || typeof identity.id !== "string")
			throw new Error("Not authenticated");
		const sortOrder = SortOrderZenum.parse(
			normalizeSortOrder(args.sortOrder ?? DEFAULT_SORT_ORDER)
		);
		const posts = sortedPosts(ctx, identity.id, sortOrder);
		const tags = args.tags ?? [];
		return (
			tags.length
				? filter(posts, (post) => tags.some((tag) => post.tags?.includes(tag)))
				: posts
		).paginate(args.paginationOpts);
	},
});

// Always resolve the current owned version before a browser reuses local bytes.
export const getOwnedFile = query({
	args: { postId: v.id("post") },
	handler: async (ctx, { postId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity || typeof identity.id !== "string") {
			throw new Error("Not authenticated");
		}
		const post = await ctx.db.get(postId);
		if (!post || post.clerkUserId !== identity.id) return null;
		return { userId: identity.id, bucketKey: post.bucketUrl };
	},
});

export const getUserTags = query({
	args: {},
	handler: async (ctx, _) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || typeof identity.id !== "string") {
			throw new Error("Not authenticated");
		}
		const userId = identity.id;
		const posts = await ctx.db
			.query("post")
			.withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
			.collect();

		const counts = posts
			.flatMap((p) => p.tags ?? [])
			.reduce<Record<string, number>>((acc, tag) => {
				acc[tag] = (acc[tag] ?? 0) + 1;
				return acc;
			}, {});

		const userTags: UserTag[] = Object.entries(counts).map(([tag, count]) => ({
			tag,
			count,
		}));
		userTags.sort((a, b) => {
			if (a.tag < b.tag) return -1;
			if (a.tag > b.tag) return 1;
			return 0;
		});
		return userTags;
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
		if (identity === null || typeof identity.id !== "string") {
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
			await ctx.db.patch(args.postId, {
				activeShareExpiresAt: activeShare.expiryDate,
			});
			// Return existing active share
			return {
				shareToken: activeShare.shareToken,
				expiryDate: activeShare.expiryDate,
				isExisting: true,
			};
		}

		const shareToken = generateSharableLinkUid();

		const expiresInHours = args.expiresInHours ?? DEFAULT_SHARE_EXPIRY_HOURS;
		if (
			!Number.isFinite(expiresInHours) ||
			expiresInHours < 1 ||
			expiresInHours > MAX_SHARE_EXPIRY_HOURS
		) {
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
			clerkUserId: identity.id,
		});

		await ctx.db.patch(args.postId, {
			activeShareExpiresAt: expiryDate.toISOString(),
		});
		return {
			shareToken,
			expiryDate: expiryDate.toISOString(),
			isExisting: false,
		};
	},
});

export async function activeShareExpiry(ctx: QueryCtx, postId: Id<"post">) {
	const shares = await ctx.db
		.query("shares")
		.withIndex("by_postId", (q) => q.eq("postId", postId))
		.collect();
	const now = Date.now();
	return shares.reduce<string | undefined>(
		(latest, share) =>
			Date.parse(share.expiryDate) > now &&
			(!latest || share.expiryDate > latest)
				? share.expiryDate
				: latest,
		undefined
	);
}

// Revoke (delete) a share by token
export const revokeShare = mutation({
	args: {
		shareToken: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || typeof identity.id !== "string") {
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
		const expiry = await activeShareExpiry(ctx, share.postId);
		if (await ctx.db.get(share.postId))
			await ctx.db.patch(share.postId, { activeShareExpiresAt: expiry });
		return { success: true };
	},
});

// Unused since #154; kept for clients deployed before it. Remove in a later release.
export const getActiveSharesForPost = query({
	args: {
		postId: v.id("post"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || typeof identity.id !== "string") {
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

export const recordUsage = mutation({
	args: { postId: v.id("post") },
	handler: async (ctx, { postId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity || typeof identity.id !== "string")
			throw new Error("Not authenticated");
		const post = await ctx.db.get(postId);
		if (!post) throw new Error("Post not found");
		if (post.clerkUserId !== identity.id)
			throw new Error("Not authorized to use this post");
		const now = Date.now();
		if (
			post.lastUsedAt !== undefined &&
			now - post.lastUsedAt < USAGE_DEBOUNCE_MS
		)
			return;
		await ctx.db.patch(postId, {
			usageCount: (post.usageCount ?? 0) + 1,
			lastUsedAt: now,
			heat: addEvent(seedHeat(post), weights.copy, now),
			rankDirty: true,
		});
	},
});
