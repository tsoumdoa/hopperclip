import { afterEach, expect, test, vi } from "vitest";
import { bucketUrl } from "./bucket-url";

afterEach(() => vi.unstubAllEnvs());

test.each([
	"https://account.r2.cloudflarestorage.com/bucket",
	"https://account.r2.cloudflarestorage.com/bucket/",
	"https://account.r2.cloudflarestorage.com/bucket///",
])("builds the same storage path with base %s", (base) => {
	vi.stubEnv("R2_URL", base);
	expect(bucketUrl("user_abc", "file-key")).toBe(
		"https://account.r2.cloudflarestorage.com/bucket/user_abc/file-key"
	);
});

test("encodes each path segment instead of allowing separators", () => {
	vi.stubEnv("R2_URL", "https://account.r2.cloudflarestorage.com/bucket/");
	expect(bucketUrl("user/abc", "file?key")).toBe(
		"https://account.r2.cloudflarestorage.com/bucket/user%2Fabc/file%3Fkey"
	);
});

test("fails closed without a configured bucket URL", () => {
	vi.stubEnv("R2_URL", undefined);
	expect(() => bucketUrl("user_abc", "file-key")).toThrow(
		"Storage is not configured"
	);
});
