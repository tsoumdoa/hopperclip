import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
	CLEANUP_BATCH_SIZE,
	CLEANUP_LEASE_MS,
	UPLOAD_EXPIRY_MS,
	findStorageObject,
	hasStorageReference,
} from "./storageLifecycle";
import { StorageKeySchema } from "../src/types/types";
import { requireServerGateway } from "./serverGateway";
import { consumeUploadLimit } from "./shareAccess";

export const reserveUpload = mutation({
	args: { key: v.string(), gatewaySecret: v.string() },
	handler: async (ctx, args) => {
		requireServerGateway(args.gatewaySecret);
		const identity = await ctx.auth.getUserIdentity();
		if (!identity || typeof identity.id !== "string") {
			throw new Error("Not authenticated");
		}
		const key = StorageKeySchema.parse(args.key);
		if (
			(await findStorageObject(ctx, identity.id, key)) ||
			(await hasStorageReference(ctx, identity.id, key))
		) {
			throw new Error("Storage key already exists. Please upload again.");
		}
		const limit = await consumeUploadLimit(ctx, identity.id);
		if (!limit.allowed) {
			throw new ConvexError({
				code: "RATE_LIMITED",
				retryAfterMs: limit.retryAfterSeconds * 1000,
			});
		}
		const expiresAt = Date.now() + UPLOAD_EXPIRY_MS;
		const uploadId = await ctx.db.insert("storageObjects", {
			clerkUserId: identity.id,
			key,
			state: "reserved",
			expiresAt,
			attempts: 0,
		});
		return { key, uploadId, expiresAt, clerkUserId: identity.id };
	},
});

export const getUpload = internalQuery({
	args: { uploadId: v.id("storageObjects"), clerkUserId: v.string() },
	handler: async (ctx, args) => {
		const object = await ctx.db.get(args.uploadId);
		if (
			!object ||
			object.clerkUserId !== args.clerkUserId ||
			(object.state !== "reserved" && object.state !== "uploaded") ||
			object.expiresAt === undefined ||
			object.expiresAt <= Date.now()
		) {
			throw new Error("Upload is missing or expired");
		}
		return object;
	},
});

export const markUploaded = internalMutation({
	args: { uploadId: v.id("storageObjects"), clerkUserId: v.string() },
	handler: async (ctx, args) => {
		const object = await ctx.db.get(args.uploadId);
		if (
			!object ||
			object.clerkUserId !== args.clerkUserId ||
			(object.state !== "reserved" && object.state !== "uploaded") ||
			object.expiresAt === undefined ||
			object.expiresAt <= Date.now()
		) {
			throw new Error("Upload is missing or expired");
		}
		await ctx.db.patch(object._id, { state: "uploaded" });
		return { key: object.key };
	},
});

export const claimDeletion = internalMutation({
	args: { objectId: v.id("storageObjects") },
	handler: async (ctx, args) => {
		const object = await ctx.db.get(args.objectId);
		const now = Date.now();
		if (
			!object ||
			object.state !== "deleting" ||
			(object.nextAttemptAt ?? 0) > now
		)
			return null;
		if (await hasStorageReference(ctx, object.clerkUserId, object.key)) {
			// Defensive protection for historical duplicates or administrative
			// changes. The final detach will enqueue this key again.
			await ctx.db.patch(object._id, {
				state: "attached",
				nextAttemptAt: undefined,
			});
			return null;
		}
		const attempt = object.attempts + 1;
		await ctx.db.patch(object._id, {
			attempts: attempt,
			nextAttemptAt: now + CLEANUP_LEASE_MS,
		});
		return { key: object.key, clerkUserId: object.clerkUserId, attempt };
	},
});

export const finishDeletion = internalMutation({
	args: {
		objectId: v.id("storageObjects"),
		attempt: v.number(),
		succeeded: v.boolean(),
	},
	handler: async (ctx, args) => {
		const object = await ctx.db.get(args.objectId);
		if (
			!object ||
			object.state !== "deleting" ||
			object.attempts !== args.attempt
		)
			return;
		if (args.succeeded) {
			await ctx.db.patch(object._id, {
				state: "deleted",
				deletedAt: Date.now(),
				nextAttemptAt: undefined,
			});
			return;
		}
		// Keep retrying at a bounded rate, even after a long credentials outage.
		// A cron also recovers actions which died before reporting this result.
		const delay = Math.min(
			24 * 60 * 60 * 1000,
			60_000 * 2 ** Math.min(args.attempt - 1, 11)
		);
		await ctx.db.patch(object._id, {
			nextAttemptAt: Date.now() + delay,
			lastFailureAt: Date.now(),
		});
		await ctx.scheduler.runAfter(delay, internal.storageActions.deleteObject, {
			objectId: object._id,
		});
	},
});

export const sweep = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		for (const state of ["reserved", "uploaded"] as const) {
			const expired = await ctx.db
				.query("storageObjects")
				.withIndex("by_state_expiry", (q) =>
					q.eq("state", state).lte("expiresAt", now)
				)
				.take(CLEANUP_BATCH_SIZE);
			for (const object of expired) {
				await ctx.db.patch(object._id, {
					state: "deleting",
					expiresAt: undefined,
					nextAttemptAt: now,
				});
			}
		}
		const due = await ctx.db
			.query("storageObjects")
			.withIndex("by_state_nextAttempt", (q) =>
				q.eq("state", "deleting").lte("nextAttemptAt", now)
			)
			.take(CLEANUP_BATCH_SIZE);
		for (const object of due) {
			await ctx.scheduler.runAfter(0, internal.storageActions.deleteObject, {
				objectId: object._id,
			});
		}
		// The next cron handles any remaining batch. No unbounded recursion or
		// repeated scheduling loop if the storage provider is unavailable.
		return { scheduled: due.length };
	},
});
