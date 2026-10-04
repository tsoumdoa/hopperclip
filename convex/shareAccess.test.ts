import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { getSharedPost } from "./ghCard";
import { IP_SHARE_CAPACITY, TOKEN_SHARE_CAPACITY } from "./shareAccess";
import { requireServerGateway } from "./serverGateway";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const clientKey = "a".repeat(64);
const gatewaySecret = "local-test-server-gateway-secret-12345678";
const now = Date.parse("2026-10-04T12:00:00Z");
const token = "a".repeat(15);
type Backend = TestConvex<typeof schema>;

async function seedShare(
	t: Backend,
	shareToken = token,
	expiryDate = new Date(now + 60_000).toISOString()
) {
	return t.run(async (ctx) => {
		const postId = await ctx.db.insert("post", {
			name: "Test snippet",
			description: "Shared content",
			tags: ["tag"],
			bucketUrl: "file-key",
			clerkUserId: "owner",
			dateCreated: new Date(now).toISOString(),
			dateUpdated: new Date(now).toISOString(),
		});
		const shareId = await ctx.db.insert("shares", {
			postId,
			shareToken,
			expiryDate,
			createdAt: new Date(now).toISOString(),
			clerkUserId: "owner",
		});
		return { postId, shareId };
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(now);
	vi.stubEnv("SERVER_GATEWAY_SECRET", gatewaySecret);
	vi.stubEnv("R2_URL", "https://test.r2.cloudflarestorage.com/bucket");
	vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
	vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe("durable share limits", () => {
	test("revoking a working share stops metadata and download access", async () => {
		const t = convexTest(schema, modules);
		await seedShare(t);
		const access = () =>
			t.action(api.ghPublicAction.generateShareableLink, {
				shareToken: token,
				clientKey,
				gatewaySecret,
			});
		expect((await access()).status).toBe("ok");
		await t.withIdentity({ id: "owner" }).mutation(api.ghCard.revokeShare, {
			shareToken: token,
		});
		expect(await access()).toEqual({ status: "not_found" });
	});

	test("concurrent guesses consume one atomic per-IP bucket without rows per token", async () => {
		const t = convexTest(schema, modules);
		const results = await Promise.all(
			Array.from({ length: 45 }, (_, i) =>
				t.mutation(internal.shareAccess.consumeAndResolve, {
					clientKey,
					shareToken: i.toString(36).padStart(15, "0"),
				})
			)
		);
		expect(results.filter((r) => r.status === "not_found")).toHaveLength(
			IP_SHARE_CAPACITY
		);
		expect(results.filter((r) => r.status === "rate_limited")).toHaveLength(15);
		const rows = await t.run((ctx) =>
			ctx.db.query("shareAccessLimits").collect()
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].tokens).toBe(0);
	});

	test("shares have a second quota across distinct IPs while unrelated shares remain accessible", async () => {
		const t = convexTest(schema, modules);
		await seedShare(t);
		await seedShare(t, "b".repeat(15));
		const results = await Promise.all(
			Array.from({ length: TOKEN_SHARE_CAPACITY + 1 }, (_, i) =>
				t.mutation(internal.shareAccess.consumeAndResolve, {
					clientKey: i.toString(16).padStart(64, "0"),
					shareToken: token,
				})
			)
		);
		expect(results.filter((r) => r.status === "ok")).toHaveLength(
			TOKEN_SHARE_CAPACITY
		);
		expect(results.at(-1)?.status).toBe("rate_limited");
		expect(
			(
				await t.mutation(internal.shareAccess.consumeAndResolve, {
					clientKey,
					shareToken: "b".repeat(15),
				})
			).status
		).toBe("ok");
	});

	test("direct action callers cannot bypass the trusted gateway; metadata query is internal", async () => {
		const t = convexTest(schema, modules);
		await seedShare(t);
		await expect(
			t.action(api.ghPublicAction.generateShareableLink, {
				shareToken: token,
				clientKey,
				gatewaySecret: "attacker",
			})
		).rejects.toThrow("Not authorized");
		expect(
			await t.run((ctx) => ctx.db.query("shareAccessLimits").collect())
		).toEqual([]);
		expect(getSharedPost).toHaveProperty("isInternal", true);
		expect(getSharedPost).not.toHaveProperty("isPublic");
		vi.stubEnv("SERVER_GATEWAY_SECRET", "short");
		expect(() => requireServerGateway("short")).toThrow("not configured");
	});
});
