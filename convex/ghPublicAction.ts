import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { AwsClient } from "aws4fetch";
import { ShareLinkUidSchema } from "../src/types/types";

const r2Client = new AwsClient({
	accessKeyId: process.env.R2_ACCESS_KEY_ID!,
	secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	region: "auto",
});

export const generateShareableLink = action({
	args: {
		shareToken: v.string(),
	},
	handler: async (ctx, args) => {
		const shareToken = ShareLinkUidSchema.parse(args.shareToken);
		const url = await ctx.runQuery(internal.ghInternalQuery.getShareableLink, {
			shareToken,
		});

		if (!url) {
			throw new Error("Share not found");
		}

		const presigned = await r2Client.sign(
			new Request(url, {
				method: "GET",
			}),
			{
				aws: { signQuery: true },
				headers: {
					"Content-Encoding": "gzip",
					"Content-Type": "application/gzip",
				},
			}
		);
		if (!presigned) {
			throw new Error("Failed to generate download url");
		}
		return presigned.url;
	},
});
