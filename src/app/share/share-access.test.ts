import { afterEach, describe, expect, test, vi } from "vitest";
import { requestSharedSnippet, ShareAccessError } from "./share-access";

afterEach(() => vi.unstubAllGlobals());

describe("share access client", () => {
	test("keeps expired links distinct from retryable failures", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
		);
		expect(
			await requestSharedSnippet("a".repeat(15), new AbortController().signal)
		).toBeNull();
	});
	test("surfaces rate limits and retry delay without silently retrying", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(null, { status: 429, headers: { "Retry-After": "2" } })
			);
		vi.stubGlobal("fetch", fetchMock);
		await expect(
			requestSharedSnippet("a".repeat(15), new AbortController().signal)
		).rejects.toMatchObject({
			retryAfterSeconds: 2,
			message: expect.stringContaining("Too many requests"),
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	test("uses a safe fallback when the retry header is missing", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 429 }))
		);
		await expect(
			requestSharedSnippet("a".repeat(15), new AbortController().signal)
		).rejects.toMatchObject({ retryAfterSeconds: 60 });
	});
	test("backend failures are retryable, not mislabeled as expired", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("Backend secret", { status: 503 }))
		);
		await expect(
			requestSharedSnippet("a".repeat(15), new AbortController().signal)
		).rejects.toThrow(ShareAccessError);
	});
});
