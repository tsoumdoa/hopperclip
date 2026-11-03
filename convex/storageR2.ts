import { AwsClient } from "aws4fetch";
import { StorageKeySchema } from "../src/types/types";

export class StorageConfigurationError extends Error {}

async function withStorageResponse<T>(
	method: "HEAD" | "DELETE" | "GET",
	clerkUserId: string,
	key: string,
	read: (response: Response) => Promise<T>
) {
	const baseUrl = process.env.R2_URL;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
	if (!baseUrl || !accessKeyId || !secretAccessKey) {
		throw new StorageConfigurationError("Storage is not configured");
	}
	if (!/^[A-Za-z0-9_-]+$/.test(clerkUserId)) {
		throw new Error("Invalid storage owner");
	}
	StorageKeySchema.parse(key);
	const client = new AwsClient({
		accessKeyId,
		secretAccessKey,
		region: "auto",
	});
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30_000);
	try {
		const request = await client.sign(
			`${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(clerkUserId)}/${encodeURIComponent(key)}`,
			{ method, signal: controller.signal }
		);
		// One bounded attempt. The durable outbox, rather than in-process SDK
		// retry loops, owns deletion retries and crash recovery.
		const response = await fetch(request);
		try {
			return await read(response);
		} finally {
			// An errored body can reject cancellation; preserve the read result/error.
			await response.body?.cancel().catch(() => {});
		}
	} finally {
		clearTimeout(timeout);
	}
}

export function storageRequest(
	method: "HEAD" | "DELETE",
	clerkUserId: string,
	key: string
) {
	return withStorageResponse(
		method,
		clerkUserId,
		key,
		async (response) => response
	);
}

// The callback consumes the body before the shared request deadline is cleared.
export function storageGet<T>(
	clerkUserId: string,
	key: string,
	read: (response: Response) => Promise<T>
) {
	return withStorageResponse("GET", clerkUserId, key, read);
}
