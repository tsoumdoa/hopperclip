import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { r2Client } from "./bucket";
import { bucketUrl } from "@/utils/utils";

async function requireAuthenticatedUserId() {
	const { isAuthenticated, userId } = await auth();

	if (!isAuthenticated || !userId) {
		throw new Error("You must be signed in to use this feature");
	}

	return userId;
}

async function ensureOk(res: Response, action: string) {
	if (!res.ok) {
		throw new Error(`R2 ${action} failed: ${res.status} ${res.statusText}`);
	}
}

export const uploadToBucket = createServerFn({ method: "POST" })
	.validator(
		(input: unknown) => {
			const parsed = z
				.object({
					nanoId: z
						.string()
						.regex(/^[A-Za-z0-9_-]{1,}$/),
					ghXmlZipped: z.array(z.number().int().min(0).max(255)),
				})
				.parse(input);
			return parsed;
		}
	)
	.handler(async ({ data }) => {
		const userId = await requireAuthenticatedUserId();
		const ghXmlZipped = new Uint8Array(data.ghXmlZipped);

		const res = await r2Client.fetch(
			new Request(bucketUrl(userId, data.nanoId), {
				method: "PUT",
				body: ghXmlZipped,
				headers: {
					"content-encoding": "gzip",
					"content-type": "application/gzip",
				},
			})
		);
		await ensureOk(res, "upload");
	});

export const deleteFromBucket = createServerFn({ method: "POST" })
	.validator((nanoId: string) => nanoId)
	.handler(async ({ data: nanoId }) => {
		const userId = await requireAuthenticatedUserId();

		const res = await r2Client.fetch(
			new Request(bucketUrl(userId, nanoId), {
				method: "DELETE",
			})
		);
		await ensureOk(res, "delete");
	});

export const generatePresigneDownloadUrl = createServerFn({ method: "POST" })
	.validator((nanoId: string) => nanoId)
	.handler(async ({ data: nanoId }) => {
		const userId = await requireAuthenticatedUserId();
		const presigned = await r2Client.sign(
			new Request(bucketUrl(userId, nanoId), {
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
	});

export const fetchGhcardsUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const { userId } = await auth();
		const user = userId
			? await clerkClient().users.getUser(userId)
			: null;

		return {
			userId,
			username: user?.username || user?.firstName || "User",
		};
	}
);
