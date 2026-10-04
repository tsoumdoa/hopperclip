import { convexTest, type TestConvex } from "convex-test";
import { AwsClient } from "aws4fetch";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { getSharedPost } from "./ghCard";
import {
	consumeAndResolve,
	IP_SHARE_CAPACITY,
	LIMIT_RETENTION_MS,
	TOKEN_SHARE_CAPACITY,
} from "./shareAccess";
import { requireServerGateway } from "./serverGateway";
import type { MutationCtx } from "./_generated/server";

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

	test("rejects exhausted IPs before reading shares, then refills without extending denied traffic retention", async () => {
		const t = convexTest(schema, modules);
		await t.run((ctx) =>
			ctx.db.insert("shareAccessLimits", {
				key: `ip:${clientKey}`,
				tokens: 0,
				updatedAt: now,
				expiresAt: now + LIMIT_RETENTION_MS,
			})
		);
		await t.run(async (ctx) => {
			const query = vi.spyOn(ctx.db, "query");
			// Convex's registration wrapper retains the original handler. Exercise it
			// in the real test transaction to observe which tables are queried.
			const registered = consumeAndResolve as typeof consumeAndResolve & {
				_handler: (
					ctx: MutationCtx,
					args: { clientKey: string; shareToken: string }
				) => Promise<unknown>;
			};
			expect(
				await registered._handler(ctx, { clientKey, shareToken: token })
			).toEqual({ status: "rate_limited", retryAfterSeconds: 2 });
			expect(query.mock.calls.map((args) => args[0])).toEqual([
				"shareAccessLimits",
			]);
		});
		vi.setSystemTime(now + 2000);
		expect(
			await t.mutation(internal.shareAccess.consumeAndResolve, {
				clientKey,
				shareToken: token,
			})
		).toEqual({ status: "not_found" });
		expect(
			await t.mutation(internal.shareAccess.consumeAndResolve, {
				clientKey,
				shareToken: token,
			})
		).toEqual({ status: "rate_limited", retryAfterSeconds: 2 });
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

	test.each([10, 15, 25])(
		"supports issued %i-character tokens",
		async (length) => {
			const t = convexTest(schema, modules);
			const shareToken = "a".repeat(length);
			await seedShare(t, shareToken);
			expect(
				(
					await t.mutation(internal.shareAccess.consumeAndResolve, {
						clientKey,
						shareToken,
					})
				).status
			).toBe("ok");
		}
	);

	test.each([
		"expired",
		"revoked",
		"owner-mismatch",
		"missing-post",
		"invalid-expiry",
	])("does not sign or return metadata for %s shares", async (scenario) => {
		const t = convexTest(schema, modules);
		const { postId, shareId } = await seedShare(t);
		await t.run(async (ctx) => {
			if (scenario === "expired")
				await ctx.db.patch(shareId, {
					expiryDate: new Date(now).toISOString(),
				});
			if (scenario === "invalid-expiry")
				await ctx.db.patch(shareId, { expiryDate: "invalid" });
			if (scenario === "revoked") await ctx.db.delete(shareId);
			if (scenario === "owner-mismatch")
				await ctx.db.patch(postId, { clerkUserId: "someone-else" });
			if (scenario === "missing-post") await ctx.db.delete(postId);
		});
		const sign = vi.spyOn(AwsClient.prototype, "sign");
		expect(
			await t.action(api.ghPublicAction.generateShareableLink, {
				shareToken: token,
				clientKey,
				gatewaySecret,
			})
		).toEqual({ status: "not_found" });
		expect(sign).not.toHaveBeenCalled();
	});

	test("signs only after rate checks and caps the download expiry at share expiry", async () => {
		const t = convexTest(schema, modules);
		await seedShare(t, token, new Date(now + 12_900).toISOString());
		const result = await t.action(api.ghPublicAction.generateShareableLink, {
			shareToken: token,
			clientKey,
			gatewaySecret,
		});
		expect(result.status).toBe("ok");
		if (result.status !== "ok") throw new Error("Expected a share");
		expect(new URL(result.downloadUrl).searchParams.get("X-Amz-Expires")).toBe(
			"12"
		);
		expect(result.sharedPost.post.name).toBe("Test snippet");
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

	test("cleanup drains expired rows in bounded batches while preserving live quotas", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			for (let i = 0; i < 205; i++)
				await ctx.db.insert("shareAccessLimits", {
					key: `ip:${i}`,
					tokens: 0,
					updatedAt: now - LIMIT_RETENTION_MS,
					expiresAt: now,
				});
			await ctx.db.insert("shareAccessLimits", {
				key: "live",
				tokens: 0,
				updatedAt: now,
				expiresAt: now + LIMIT_RETENTION_MS,
			});
		});
		expect(await t.mutation(internal.shareAccess.pruneExpiredLimits, {})).toBe(
			200
		);
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(
			(await t.run((ctx) => ctx.db.query("shareAccessLimits").collect())).map(
				(row) => row.key
			)
		).toEqual(["live"]);
	});
});
