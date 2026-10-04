import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { StorageKeySchema } from "../src/types/types";

export const UPLOAD_EXPIRY_MS = 24 * 60 * 60 * 1000;
// Actions are bounded below this lease. A crashed action is retried by sweep.
export const CLEANUP_LEASE_MS = 5 * 60 * 1000;
export const CLEANUP_BATCH_SIZE = 50;

export async function findStorageObject(
	ctx: QueryCtx,
	clerkUserId: string,
	key: string
) {
	return ctx.db
		.query("storageObjects")
		.withIndex("by_user_key", (q) =>
			q.eq("clerkUserId", clerkUserId).eq("key", key)
		)
		.unique();
}

export async function hasStorageReference(
	ctx: QueryCtx,
	clerkUserId: string,
	key: string
) {
	return (
		(await ctx.db
			.query("post")
			.withIndex("by_user_storageKey", (q) =>
				q.eq("clerkUserId", clerkUserId).eq("bucketUrl", key)
			)
			.first()) !== null
	);
}

// Called in the same mutation as the post insert/replacement. An upload can be
// consumed once only; deleting/deleted keys cannot be reattached during retries.
export async function attachUploadedObject(
	ctx: MutationCtx,
	clerkUserId: string,
	key: string
) {
	const object = await findStorageObject(ctx, clerkUserId, key);
	if (
		!object ||
		object.state !== "uploaded" ||
		object.expiresAt === undefined ||
		object.expiresAt <= Date.now()
	) {
		throw new Error(
			"Upload is missing, expired, or already used. Upload again."
		);
	}
	await ctx.db.patch(object._id, {
		state: "attached",
		expiresAt: undefined,
	});
}

// Caller first removes/replaces the reference, within this same transaction.
// Existing cards need no bulk migration: their ledger entry is created lazily.
export async function enqueueUnreferencedObject(
	ctx: MutationCtx,
	clerkUserId: string,
	key: string
) {
	if (await hasStorageReference(ctx, clerkUserId, key)) return;
	// Never turn a malformed historical key into an arbitrary object URL.
	if (!StorageKeySchema.safeParse(key).success) {
		console.error("Storage cleanup skipped an invalid legacy key");
		return;
	}
	const existing = await findStorageObject(ctx, clerkUserId, key);
	if (existing?.state === "deleting" || existing?.state === "deleted") return;
	const nextAttemptAt = Date.now();
	let objectId;
	if (existing) {
		objectId = existing._id;
		await ctx.db.patch(objectId, {
			state: "deleting",
			expiresAt: undefined,
			nextAttemptAt,
		});
	} else {
		objectId = await ctx.db.insert("storageObjects", {
			clerkUserId,
			key,
			state: "deleting",
			attempts: 0,
			nextAttemptAt,
		});
	}
	await ctx.scheduler.runAfter(0, internal.storageActions.deleteObject, {
		objectId,
	});
}
