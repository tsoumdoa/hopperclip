import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { env } from "@/env";
import { z } from "@/lib/zod";
import { StorageKeySchema } from "@/types/types";
import { r2Client } from "./bucket";
import { bucketUrl } from "./bucket-url";

// Additive endpoint: older deployments can continue using generatePresigneDownloadUrl.
export const resolveOwnedGhDownload = createServerFn({ method: "POST" })
	.validator((postId: string) => z.string().min(1).max(100).parse(postId))
	.handler(async ({ data: postId }) => {
		setResponseHeader("Cache-Control", "no-store");
		const session = await auth();
		if (!session.isAuthenticated || !session.userId)
			throw new Error("Please sign in to open this snippet");
		const token = await session.getToken({ template: "convex" });
		if (!token) throw new Error("Please sign in to open this snippet");
		const client = new ConvexHttpClient(env.VITE_CONVEX_URL, {
			logger: false,
			fetch: (input, init) =>
				fetch(input, {
					...init,
					cache: "no-store",
					signal: AbortSignal.timeout(15_000),
				}),
		});
		client.setAuth(token);
		const file = await client.query(api.ghCard.getOwnedFile, {
			postId: postId as Id<"post">,
		});
		if (!file || file.userId !== session.userId) return null;
		const bucketKey = StorageKeySchema.parse(file.bucketKey);
		const url = new URL(bucketUrl(session.userId, bucketKey));
		url.searchParams.set("X-Amz-Expires", "300");
		const signed = await r2Client.sign(new Request(url, { method: "GET" }), {
			aws: { signQuery: true },
		});
		return {
			userId: session.userId,
			postId,
			bucketKey,
			downloadUrl: signed.url,
		};
	});
