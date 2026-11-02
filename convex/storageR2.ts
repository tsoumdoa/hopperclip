import { AwsClient } from "aws4fetch";
import { StorageKeySchema } from "../src/types/types";

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
		try {
			return await read(response);
		} finally {
			await response.body?.cancel();
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

// Both the metadata check and streaming byte count are needed: legacy objects
// may omit Content-Length. The caller's request timeout covers this entire read.
export async function readStorageBody(
	response: Response,
	maxBytes: number
): Promise<ArrayBuffer | null> {
	if (Number(response.headers.get("content-length")) > maxBytes) return null;
	if (!response.body) return new ArrayBuffer(0);
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel();
				return null;
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes.buffer;
}

export function storageGet(clerkUserId: string, key: string, maxBytes: number) {
	return withStorageResponse("GET", clerkUserId, key, async (response) => {
		if (!response.ok) throw new Error(`Storage GET failed: ${response.status}`);
		return readStorageBody(response, maxBytes);
	});
}
