"use node";

// The default runtime's fetch strips Content-Encoding and Content-Length from
// gzip responses, including HEAD. Node preserves the stored R2 metadata needed
// to verify the compressed size and format before finalizing an upload.
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { MAX_COMPRESSED_GH_XML_BYTES } from "../src/types/types";
import { requireServerGateway } from "./serverGateway";
import { storageRequest } from "./storageR2";

export const completeUpload = action({
	args: { uploadId: v.id("storageObjects"), gatewaySecret: v.string() },
	handler: async (ctx, args): Promise<{ key: string }> => {
		requireServerGateway(args.gatewaySecret);
		const identity = await ctx.auth.getUserIdentity();
		if (!identity || typeof identity.id !== "string") {
			throw new Error("Not authenticated");
		}
		const object = await ctx.runQuery(internal.storage.getUpload, {
			uploadId: args.uploadId,
			clerkUserId: identity.id,
		});
		const response = await storageRequest(
			"HEAD",
			object.clerkUserId,
			object.key
		);
		const size = Number(response.headers.get("content-length"));
		if (
			!response.ok ||
			!Number.isSafeInteger(size) ||
			size <= 0 ||
			size > MAX_COMPRESSED_GH_XML_BYTES ||
			response.headers.get("content-encoding") !== "gzip" ||
			response.headers.get("content-type")?.split(";")[0] !== "application/gzip"
		) {
			throw new Error("Uploaded file could not be verified");
		}
		return ctx.runMutation(internal.storage.markUploaded, {
			uploadId: args.uploadId,
			clerkUserId: identity.id,
		});
	},
});

export const deleteObject = internalAction({
	args: { objectId: v.id("storageObjects") },
	handler: async (ctx, args) => {
		const claimed = await ctx.runMutation(internal.storage.claimDeletion, args);
		if (!claimed) return;
		let succeeded = false;
		try {
			const response = await storageRequest(
				"DELETE",
				claimed.clerkUserId,
				claimed.key
			);
			// Deletion may have succeeded before a previous action crashed.
			succeeded = response.ok || response.status === 404;
			if (!succeeded) console.error("Storage cleanup failed", response.status);
		} catch {
			console.error("Storage cleanup request failed; retry remains queued");
		}
		await ctx.runMutation(internal.storage.finishDeletion, {
			objectId: args.objectId,
			attempt: claimed.attempt,
			succeeded,
		});
	},
});
