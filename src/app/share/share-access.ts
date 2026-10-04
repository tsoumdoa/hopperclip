import type { ShareAccessResult } from "@/types/share-access";

export class ShareAccessError extends Error {
	constructor(
		message: string,
		public readonly retryAfterSeconds = 0
	) {
		super(message);
	}
}

export async function requestSharedSnippet(
	shareToken: string,
	signal: AbortSignal
) {
	const response = await fetch("/api/share", {
		method: "POST",
		body: JSON.stringify({ shareToken }),
		headers: { "Content-Type": "application/json" },
		cache: "no-store",
		signal,
	});
	if (response.status === 429) {
		const seconds = Number(response.headers.get("Retry-After"));
		throw new ShareAccessError(
			"Too many requests. Please wait a moment before trying again.",
			Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60
		);
	}
	if (response.status === 404) return null;
	if (!response.ok)
		throw new ShareAccessError(
			"This snippet could not be loaded. Please try again."
		);
	const result = (await response.json()) as ShareAccessResult;
	if (result.status !== "ok")
		throw new ShareAccessError(
			"This snippet could not be loaded. Please try again."
		);
	return result;
}
