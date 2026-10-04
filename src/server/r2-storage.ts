import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { r2Client } from "./bucket";
import { bucketUrl } from "./bucket-url";
import { StorageKeySchema } from "@/types/types";

const PRESIGNED_DOWNLOAD_EXPIRY_SECONDS = 300;

async function requireAuthenticatedUserId() {
	const { isAuthenticated, userId } = await auth();

	if (!isAuthenticated || !userId) {
		throw new Error("You must be signed in to use this feature");
	}

	return userId;
}

export const generatePresigneDownloadUrl = createServerFn({ method: "POST" })
	.validator((nanoId: string) => StorageKeySchema.parse(nanoId))
	.handler(async ({ data: nanoId }) => {
		const userId = await requireAuthenticatedUserId();
		const url = new URL(bucketUrl(userId, nanoId));
		url.searchParams.set(
			"X-Amz-Expires",
			String(PRESIGNED_DOWNLOAD_EXPIRY_SECONDS)
		);
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
	});

export const fetchGhcardsUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const { userId } = await auth();
		const user = userId ? await clerkClient().users.getUser(userId) : null;

		return {
			userId,
			username: user?.username || user?.firstName || "User",
		};
	}
);
