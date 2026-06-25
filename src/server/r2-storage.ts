import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { r2Client } from "./bucket";
import { bucketUrl } from "@/utils/utils";

async function requireAuthenticatedUserId() {
	const { isAuthenticated, userId } = await auth();

	if (!isAuthenticated || !userId) {
		throw new Error("You must be signed in to use this feature");
	}

	return userId;
}

export const uploadToBucket = createServerFn({ method: "POST" })
	.validator(
		(input: { nanoId: string; ghXmlZipped: number[] }) => input
	)
	.handler(async ({ data }) => {
		const userId = await requireAuthenticatedUserId();
		const ghXmlZipped = new Uint8Array(data.ghXmlZipped);

		await r2Client.fetch(
			new Request(bucketUrl(userId, data.nanoId), {
				method: "PUT",
				body: ghXmlZipped,
				headers: {
					"content-encoding": "gzip",
					"content-type": "application/gzip",
				},
			})
		);
	});

export const deleteFromBucket = createServerFn({ method: "POST" })
	.validator((nanoId: string) => nanoId)
	.handler(async ({ data: nanoId }) => {
		const userId = await requireAuthenticatedUserId();

		await r2Client.fetch(
			new Request(bucketUrl(userId, nanoId), {
				method: "DELETE",
			})
		);
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
