import { v } from "convex/values";
import {
	mutation,
	query,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { StorageKeySchema } from "../src/types/types";
import { PREVIEW_VERSION, type PreviewData } from "../src/types/preview";
import { previewDataValidator, validatePreview } from "./previewData";

export function findPreview(
	ctx: QueryCtx,
	clerkUserId: string,
	storageKey: string
) {
	return ctx.db
		.query("postPreviews")
		.withIndex("by_user_key", (q) =>
			q.eq("clerkUserId", clerkUserId).eq("storageKey", storageKey)
		)
		.unique();
}

export function findPreviewPost(
	ctx: QueryCtx,
	clerkUserId: string,
	storageKey: string
) {
	return ctx.db
		.query("post")
		.withIndex("by_user_storageKey", (q) =>
			q.eq("clerkUserId", clerkUserId).eq("bucketUrl", storageKey)
		)
		.first();
}

export async function deletePreview(
	ctx: MutationCtx,
	clerkUserId: string,
	storageKey: string
) {
	const row = await findPreview(ctx, clerkUserId, storageKey);
	if (row) await ctx.db.delete(row._id);
	const claims = await ctx.db
		.query("previewBackfillClaims")
		.withIndex("by_user_key_version", (q) =>
			q.eq("clerkUserId", clerkUserId).eq("storageKey", storageKey)
		)
		.collect();
	for (const claim of claims) await ctx.db.delete(claim._id);
}

export async function savePreviewForUser(
	ctx: MutationCtx,
	{
		clerkUserId,
		storageKey,
		version,
		data,
	}: {
		clerkUserId: string;
		storageKey: string;
		version: number;
		data: PreviewData;
	},
	{ skipMissing = false } = {}
) {
	StorageKeySchema.parse(storageKey);

	const post = await findPreviewPost(ctx, clerkUserId, storageKey);
	if (!post) {
		if (skipMissing) return null;
		throw new Error("Not authorized to save this preview");
	}
	if (version !== PREVIEW_VERSION) throw new Error("Invalid preview version");
	validatePreview(data);
	const existing = await findPreview(ctx, clerkUserId, storageKey);
	if (existing?.version === version) return false;
	if (existing) await ctx.db.patch(existing._id, { version, data });
	else
		await ctx.db.insert("postPreviews", {
			clerkUserId,
			storageKey,
			version,
			data,
		});
	return true;
}

export const savePreview = mutation({
	args: {
		storageKey: v.string(),
		version: v.number(),
		data: previewDataValidator,
	},
	handler: async (ctx, { storageKey, version, data }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity || typeof identity.id !== "string")
			throw new Error("Not authenticated");
		await savePreviewForUser(ctx, {
			clerkUserId: identity.id,
			storageKey,
			version,
			data,
		});
	},
});

export const getPreview = query({
	args: { storageKey: v.string() },
	handler: async (ctx, { storageKey }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity || typeof identity.id !== "string")
			throw new Error("Not authenticated");
		if (!StorageKeySchema.safeParse(storageKey).success) return null;
		const userId = identity.id;
		const row = await findPreview(ctx, userId, storageKey);
		return row ? { version: row.version, data: row.data } : null;
	},
});
