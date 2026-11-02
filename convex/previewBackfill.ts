// Start: pnpm exec convex run previewBackfill:start; cancel: pnpm exec convex run previewBackfill:cancel; claims make each file one-shot per PREVIEW_VERSION.
import { Workpool, vOnCompleteValidator } from "@convex-dev/workpool";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StorageKeySchema } from "../src/types/types";
import { PREVIEW_VERSION } from "../src/types/preview";
import { previewDataValidator } from "./previewData";
import { findPreview, findPreviewPost, savePreviewForUser } from "./previews";

const pool = new Workpool(components.previewBackfillPool, {
	maxParallelism: 2,
	retryActionsByDefault: true,
	defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 2000, base: 2 },
});

const entry = { clerkUserId: v.string(), storageKey: v.string() };

// Enqueueing this page and scheduling the next are one transaction. An action
// crash can exhaust that item's retries, but cannot strand the rest of the pass.
export const start = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, { cursor }): Promise<void> => {
		const result = await ctx.db.query("post").paginate({
			cursor: cursor ?? null,
			numItems: 100,
		});
		for (const post of result.page) {
			if (
				!post.clerkUserId ||
				!StorageKeySchema.safeParse(post.bucketUrl).success
			)
				continue;
			const preview = await findPreview(ctx, post.clerkUserId, post.bucketUrl);
			if (preview?.version === PREVIEW_VERSION) continue;
			const claim = await ctx.db
				.query("previewBackfillClaims")
				.withIndex("by_user_key_version", (q) =>
					q
						.eq("clerkUserId", post.clerkUserId!)
						.eq("storageKey", post.bucketUrl)
						.eq("version", PREVIEW_VERSION)
				)
				.unique();
			if (claim) continue;
			const args = {
				clerkUserId: post.clerkUserId,
				storageKey: post.bucketUrl,
			};
			// The claim and enqueue commit together, including across overlapping passes.
			await ctx.db.insert("previewBackfillClaims", {
				...args,
				version: PREVIEW_VERSION,
			});
			await pool.enqueueAction(
				ctx,
				internal.previewBackfillNode.buildOne,
				args,
				{
					onComplete: internal.previewBackfill.onComplete,
					onCompleteExcludeKinds: ["success"],
					context: args,
				}
			);
		}
		if (!result.isDone)
			await ctx.scheduler.runAfter(0, internal.previewBackfill.start, {
				cursor: result.continueCursor,
			});
	},
});

export const cancel = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Running attempts can finish, but canceled work will not be retried.
		await pool.cancelAll(ctx);
	},
});

export const onComplete = internalMutation({
	args: vOnCompleteValidator(v.object(entry)),
	handler: async (_ctx, { workId, context, result }) => {
		if (result.kind === "failed")
			console.error(
				"Preview backfill terminal failure",
				workId,
				context.clerkUserId,
				context.storageKey
			);
	},
});

export const getState = internalQuery({
	args: entry,
	handler: async (ctx, { clerkUserId, storageKey }) => {
		if (!(await findPreviewPost(ctx, clerkUserId, storageKey)))
			return "missing";
		return (await findPreview(ctx, clerkUserId, storageKey))?.version ===
			PREVIEW_VERSION
			? "current"
			: "pending";
	},
});

export const savePreviewInternal = internalMutation({
	args: {
		...entry,
		version: v.number(),
		data: previewDataValidator,
	},
	handler: (ctx, args) => savePreviewForUser(ctx, args, { skipMissing: true }),
});
