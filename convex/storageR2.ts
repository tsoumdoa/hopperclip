import { AwsClient } from "aws4fetch";
import { StorageKeySchema } from "../src/types/types";

export async function storageRequest(
	method: "HEAD" | "DELETE",
	clerkUserId: string,
	key: string
) {
	const baseUrl = process.env.R2_URL;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
	if (!baseUrl || !accessKeyId || !secretAccessKey) {
		throw new Error("Storage is not configured");
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
		// Neither operation needs a response body (including provider errors).
		// Release its stream while the request deadline still applies.
		await response.body?.cancel();
		return response;
	} finally {
		clearTimeout(timeout);
	}
}
