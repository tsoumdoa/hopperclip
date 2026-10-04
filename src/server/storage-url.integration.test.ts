import { afterEach, expect, test, vi } from "vitest";
import { storageRequest } from "@convex/storageR2";
import { bucketUrl } from "./bucket-url";

vi.mock("aws4fetch", () => ({
	AwsClient: class {
		async sign(url: string, init: RequestInit) {
			return new Request(url, init);
		}
	},
}));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test.each([
	"https://account.r2.cloudflarestorage.com/bucket",
	"https://account.r2.cloudflarestorage.com/bucket/",
	"https://account.r2.cloudflarestorage.com/bucket///",
])(
	"web PUT/download and Convex HEAD/delete use identical paths with base %s",
	async (base) => {
		vi.stubEnv("R2_URL", base);
		vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-id");
		vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
		const fetch = vi.fn<typeof globalThis.fetch>(
			async () => new Response(null, { status: 200 })
		);
		vi.stubGlobal("fetch", fetch);
		await storageRequest("HEAD", "user_abc", "file-key");
		await storageRequest("DELETE", "user_abc", "file-key");
		const expected = bucketUrl("user_abc", "file-key");
		expect(fetch).toHaveBeenCalledTimes(2);
		for (const [request] of fetch.mock.calls) {
			expect((request as Request).url).toBe(expected);
		}
	}
);
