import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { ShareLinkUidSchema, StorageKeySchema } from "../src/types/types";

export const IP_SHARE_CAPACITY = 30;
export const TOKEN_SHARE_CAPACITY = 120;
export const UPLOAD_CAPACITY = 20;
export const LIMIT_RETENTION_MS = 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 200;

/** Must run inside a mutation: Convex retries conflicting reads/writes atomically. */
export async function consumeRateLimit(
	ctx: MutationCtx,
	key: string,
	capacity: number,
	now = Date.now()
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
	const prior = await ctx.db
		.query("shareAccessLimits")
		.withIndex("by_key", (q) => q.eq("key", key))
		.unique();
	const refillPerMs = capacity / 60_000;
	const tokens = prior
		? Math.min(
				capacity,
				prior.tokens + Math.max(0, now - prior.updatedAt) * refillPerMs
			)
		: capacity;
	if (tokens < 1) {
		return {
			allowed: false,
			retryAfterSeconds: Math.max(
				1,
				Math.ceil((1 - tokens) / refillPerMs / 1000)
			),
		};
	}
	const next = {
		key,
		tokens: tokens - 1,
		updatedAt: now,
		expiresAt: now + LIMIT_RETENTION_MS,
	};
	if (prior) await ctx.db.patch(prior._id, next);
	else await ctx.db.insert("shareAccessLimits", next);
	return { allowed: true };
}

export function consumeUploadLimit(ctx: MutationCtx, userId: string) {
	return consumeRateLimit(ctx, `upload:${userId}`, UPLOAD_CAPACITY);
}

export const consumeAndResolve = internalMutation({
	args: { clientKey: v.string(), shareToken: v.string() },
	handler: async (ctx, args) => {
		// A trusted server provides only a keyed hash, never a raw IP or caller-chosen key.
		if (!/^[a-f0-9]{64}$/.test(args.clientKey))
			throw new Error("Invalid client key");
		const now = Date.now();
		const ipLimit = await consumeRateLimit(
			ctx,
			`ip:${args.clientKey}`,
			IP_SHARE_CAPACITY,
			now
		);
		if (!ipLimit.allowed) {
			return {
				status: "rate_limited" as const,
				retryAfterSeconds: ipLimit.retryAfterSeconds,
			};
		}
		// Consume the IP quota BEFORE parsing or looking up any submitted token.
		const parsed = ShareLinkUidSchema.safeParse(args.shareToken);
		if (!parsed.success) return { status: "not_found" as const };
		const share = await ctx.db
			.query("shares")
			.withIndex("by_shareToken", (q) => q.eq("shareToken", parsed.data))
			.first();
		if (!share || !(Date.parse(share.expiryDate) > now))
			return { status: "not_found" as const };
		const post = await ctx.db.get(share.postId);
		if (!post || post.clerkUserId !== share.clerkUserId)
			return { status: "not_found" as const };
		const storageKey = StorageKeySchema.safeParse(post.bucketUrl);
		if (!storageKey.success) return { status: "not_found" as const };
		// Only existing valid shares get a bucket; random token guesses cannot grow this table.
		const tokenLimit = await consumeRateLimit(
			ctx,
			`share:${share._id}`,
			TOKEN_SHARE_CAPACITY,
			now
		);
		if (!tokenLimit.allowed) {
			return {
				status: "rate_limited" as const,
				retryAfterSeconds: tokenLimit.retryAfterSeconds,
			};
		}
		return {
			status: "ok" as const,
			ownerId: share.clerkUserId,
			storageKey: storageKey.data,
			sharedPost: {
				post: {
					name: post.name,
					description: post.description,
					tags: post.tags,
				},
				sharedToken: share.shareToken,
				shareToken: share.shareToken,
				expiryDate: share.expiryDate,
			},
		};
	},
});

export const pruneExpiredLimits = internalMutation({
	args: {},
	handler: async (ctx) => {
		const expired = await ctx.db
			.query("shareAccessLimits")
			.withIndex("by_expiresAt", (q) => q.lte("expiresAt", Date.now()))
			.take(CLEANUP_BATCH_SIZE);
		for (const row of expired) await ctx.db.delete(row._id);
		if (expired.length === CLEANUP_BATCH_SIZE) {
			await ctx.scheduler.runAfter(
				0,
				internal.shareAccess.pruneExpiredLimits,
				{}
			);
		}
		return expired.length;
	},
});
