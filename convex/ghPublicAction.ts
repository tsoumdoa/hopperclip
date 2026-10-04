import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { AwsClient } from "aws4fetch";
import { bucketUrl } from "../src/server/bucket-url";
import { requireServerGateway } from "./serverGateway";
import type { ShareAccessResult } from "../src/types/share-access";

const PRESIGNED_DOWNLOAD_EXPIRY_SECONDS = 300;

// This keeps the old function name, but callers must now go through /api/share.
export const generateShareableLink = action({
	args: {
		shareToken: v.string(),
		gatewaySecret: v.string(),
		clientKey: v.string(),
	},
	handler: async (ctx, args): Promise<ShareAccessResult> => {
		requireServerGateway(args.gatewaySecret);
		const result = await ctx.runMutation(
			internal.shareAccess.consumeAndResolve,
			{
				clientKey: args.clientKey,
				shareToken: args.shareToken,
			}
		);
		if (result.status !== "ok") return result;
		// A short-lived R2 capability must never outlive the underlying share.
		const signingTime = Date.now();
		const expirySeconds = Math.min(
			PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
			Math.floor(
				(Date.parse(result.sharedPost.expiryDate) - signingTime) / 1000
			)
		);
		if (expirySeconds < 1) return { status: "not_found" };
		const url = new URL(bucketUrl(result.ownerId, result.storageKey));
		url.searchParams.set("X-Amz-Expires", String(expirySeconds));
		const r2Client = new AwsClient({
			accessKeyId: process.env.R2_ACCESS_KEY_ID!,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
			region: "auto",
		});
		const signed = await r2Client.sign(new Request(url, { method: "GET" }), {
			aws: {
				signQuery: true,
				datetime: new Date(signingTime)
					.toISOString()
					.replace(/[:-]|\.\d{3}/g, ""),
			},
		});
		return {
			status: "ok",
			sharedPost: result.sharedPost,
			downloadUrl: signed.url,
		};
	},
});
