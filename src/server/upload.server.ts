import { auth } from "@clerk/tanstack-react-start/server";
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { nanoid } from "nanoid";
import { api } from "@convex/_generated/api";
import { env } from "@/env";
import { r2Client } from "./bucket";
import { bucketUrl } from "./bucket-url";
import { createUploadHandler } from "./upload-handler";

export const handleUpload = createUploadHandler<
	FunctionReturnType<typeof api.storage.reserveUpload>
>({
	trustedOrigin: env.VITE_HOSTING_DOMAIN,
	allowLocalDevelopment: env.NODE_ENV === "development",
	authenticate: async (signal) => {
		const session = await auth();
		if (!session.isAuthenticated || !session.userId) return null;
		const gatewaySecret = env.SERVER_GATEWAY_SECRET;
		if (!gatewaySecret || gatewaySecret.length < 32) {
			throw new Error("Upload gateway is not configured");
		}
		const token = await session.getToken({ template: "convex" });
		if (!token) return null;
		// A client per request prevents one user's JWT leaking into another
		// concurrent upload. Only the authenticated backend receives this token.
		const convex = new ConvexHttpClient(env.VITE_CONVEX_URL, {
			logger: false,
			fetch: (input, init) =>
				fetch(input, {
					...init,
					signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
				}),
		});
		convex.setAuth(token);
		return {
			userId: session.userId,
			reserve: () =>
				convex.mutation(api.storage.reserveUpload, {
					key: nanoid(),
					gatewaySecret,
				}),
			complete: (reservation) =>
				convex.action(api.storageActions.completeUpload, {
					uploadId: reservation.uploadId,
					gatewaySecret,
				}),
		};
	},
	put: async (userId, key, bytes, signal) => {
		// Sign the byte view directly: AwsClient.fetch(Request) clones and buffers
		// the request again and automatically retries with long backoffs.
		const signed = await r2Client.sign(bucketUrl(userId, key), {
			method: "PUT",
			body: bytes,
			signal,
			headers: {
				"content-encoding": "gzip",
				"content-type": "application/gzip",
			},
		});
		signal.throwIfAborted();
		const response = await fetch(signed);
		void response.body?.cancel().catch(() => {});
		if (!response.ok) throw new Error("Storage upload failed");
	},
	rateLimitResponse: (error) => {
		if (!(error instanceof ConvexError)) return;
		const data: unknown = error.data;
		if (
			typeof data !== "object" ||
			data === null ||
			!("code" in data) ||
			data.code !== "RATE_LIMITED" ||
			!("retryAfterMs" in data) ||
			typeof data.retryAfterMs !== "number" ||
			!Number.isFinite(data.retryAfterMs)
		)
			return;
		return Response.json(
			{ error: "Too many uploads. Please try again shortly." },
			{
				status: 429,
				headers: {
					"Cache-Control": "no-store",
					"Retry-After": String(
						Math.max(1, Math.ceil(data.retryAfterMs / 1000))
					),
				},
			}
		);
	},
});
