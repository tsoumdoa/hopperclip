import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { storageRequest } from "./storageR2";

beforeEach(() => {
	vi.stubEnv("R2_URL", "https://example.r2.cloudflarestorage.com/scripts/");
	vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
	vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

it("signs one deletion in the stored owner namespace and releases error bodies", async () => {
	const cancel = vi.fn();
	const fetchMock = vi
		.fn()
		.mockResolvedValue(
			new Response(new ReadableStream({ cancel }), { status: 503 })
		);
	vi.stubGlobal("fetch", fetchMock);
	const result = await storageRequest("DELETE", "user_alice", "key_-012");
	expect(result.status).toBe(503);
	expect(fetchMock).toHaveBeenCalledTimes(1);
	const request: Request = fetchMock.mock.calls[0][0];
	expect(request.method).toBe("DELETE");
	expect(request.url).toBe(
		"https://example.r2.cloudflarestorage.com/scripts/user_alice/key_-012"
	);
	expect(request.headers.get("authorization")).toContain("AWS4-HMAC-SHA256");
	expect(cancel).toHaveBeenCalledOnce();
});

it("rejects malformed stored owners and keys before making a request", async () => {
	const fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	await expect(storageRequest("DELETE", "../victim", "key")).rejects.toThrow(
		"Invalid storage owner"
	);
	await expect(
		storageRequest("DELETE", "user_alice", "../key")
	).rejects.toThrow();
	expect(fetchMock).not.toHaveBeenCalled();
});

it("aborts a stalled request instead of retaining the cleanup lease indefinitely", async () => {
	vi.useFakeTimers();
	const fetchMock = vi.fn(
		(request: Request) =>
			new Promise<Response>((_, reject) => {
				if (request.signal.aborted) reject(new Error("aborted"));
				else
					request.signal.addEventListener(
						"abort",
						() => reject(new Error("aborted")),
						{ once: true }
					);
			})
	);
	vi.stubGlobal("fetch", fetchMock);
	const pending = storageRequest("HEAD", "user_alice", "key");
	const assertion = expect(pending).rejects.toThrow("aborted");
	await vi.advanceTimersByTimeAsync(30_000);
	await assertion;
	expect(fetchMock).toHaveBeenCalledTimes(1);
});
