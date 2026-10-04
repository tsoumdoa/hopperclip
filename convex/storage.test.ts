import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { storageRequest } from "./storageR2";
import {
	CLEANUP_BATCH_SIZE,
	CLEANUP_LEASE_MS,
	UPLOAD_EXPIRY_MS,
} from "./storageLifecycle";
import type { Id } from "./_generated/dataModel";

vi.mock("./storageR2", () => ({ storageRequest: vi.fn() }));

const modules = import.meta.glob([
	"./**/*.ts",
	"./_generated/*.js",
	"!./**/*.test.ts",
]);
const gatewaySecret = "test-only-gateway-secret-at-least-32-characters";
const metadata = { name: "Example card", description: "", tags: [] };
type Backend = TestConvex<typeof schema>;

function asOwner(t: Backend, id = "user_alice") {
	return t.withIdentity({ id });
}

async function reserve(t: Backend, key: string, owner = "user_alice") {
	return asOwner(t, owner).mutation(api.storage.reserveUpload, {
		key,
		gatewaySecret,
	});
}

async function upload(t: Backend, key: string, owner = "user_alice") {
	const reservation = await reserve(t, key, owner);
	await asOwner(t, owner).action(api.storageActions.completeUpload, {
		uploadId: reservation.uploadId,
		gatewaySecret,
	});
	return reservation;
}

async function legacyPost(
	t: Backend,
	key = "legacy_key",
	owner = "user_alice"
) {
	return t.run((ctx) =>
		ctx.db.insert("post", {
			...metadata,
			bucketUrl: key,
			clerkUserId: owner,
			dateCreated: new Date().toISOString(),
			dateUpdated: new Date().toISOString(),
		})
	);
}

async function objectFor(t: Backend, key: string) {
	return t.run((ctx) =>
		ctx.db
			.query("storageObjects")
			.withIndex("by_user_key", (q) =>
				q.eq("clerkUserId", "user_alice").eq("key", key)
			)
			.unique()
	);
}

async function queuedObject(t: Backend, key = "old_key") {
	return t.run((ctx) =>
		ctx.db.insert("storageObjects", {
			clerkUserId: "user_alice",
			key,
			state: "deleting",
			attempts: 0,
			nextAttemptAt: Date.now(),
		})
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-10-04T00:00:00Z"));
	vi.stubEnv("SERVER_GATEWAY_SECRET", gatewaySecret);
	vi.mocked(storageRequest)
		.mockReset()
		.mockImplementation(async (method) =>
			method === "HEAD"
				? new Response(null, {
						status: 200,
						headers: {
							"content-length": "1024",
							"content-type": "application/gzip",
							"content-encoding": "gzip",
						},
					})
				: new Response(null, { status: 204 })
		);
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllEnvs();
});

describe("upload ownership and lifecycle", () => {
	it("rejects identities missing the Clerk id instead of matching ownerless legacy rows", async () => {
		const t = convexTest(schema, modules);
		const id = await t.run((ctx) =>
			ctx.db.insert("post", {
				...metadata,
				bucketUrl: "legacy_key",
				dateCreated: "",
				dateUpdated: "",
			})
		);
		const missingClaim = t.withIdentity({
			subject: "authenticated-without-id",
		});
		await expect(
			missingClaim.mutation(api.ghCard.deletePost, { id })
		).rejects.toThrow("Not authenticated");
		await expect(
			missingClaim.mutation(api.ghCard.updatePost, { id, ...metadata })
		).rejects.toThrow("Not authenticated");
		await expect(missingClaim.query(api.ghCard.getAll, {})).rejects.toThrow(
			"Not authenticated"
		);
		expect(await t.run((ctx) => ctx.db.get(id))).not.toBeNull();
	});

	it("requires both a trusted gateway and authenticated owner", async () => {
		const t = convexTest(schema, modules);
		await expect(
			t.mutation(api.storage.reserveUpload, { key: "key", gatewaySecret })
		).rejects.toThrow("Not authenticated");
		await expect(
			asOwner(t).mutation(api.storage.reserveUpload, {
				key: "key",
				gatewaySecret: "wrong",
			})
		).rejects.toThrow("Not authorized");
		expect(
			await t.run((ctx) => ctx.db.query("storageObjects").collect())
		).toEqual([]);
		const pending = await reserve(t, "owned");
		expect(pending.clerkUserId).toBe("user_alice");
		await expect(
			asOwner(t, "user_bob").action(api.storageActions.completeUpload, {
				uploadId: pending.uploadId,
				gatewaySecret,
			})
		).rejects.toThrow("Upload is missing or expired");
		await expect(
			asOwner(t).action(api.storageActions.completeUpload, {
				uploadId: pending.uploadId,
				gatewaySecret: "wrong",
			})
		).rejects.toThrow("Not authorized");
		expect(storageRequest).not.toHaveBeenCalled();
	});

	it("rejects unfinished, unverified, foreign, and already consumed uploads", async () => {
		const t = convexTest(schema, modules);
		const pending = await reserve(t, "owned");
		await expect(
			asOwner(t).mutation(api.ghCard.addPost, { ...metadata, uid: pending.key })
		).rejects.toThrow("Upload is missing");
		vi.mocked(storageRequest).mockResolvedValueOnce(
			new Response(null, { status: 404 })
		);
		await expect(
			asOwner(t).action(api.storageActions.completeUpload, {
				uploadId: pending.uploadId,
				gatewaySecret,
			})
		).rejects.toThrow("could not be verified");
		expect((await objectFor(t, pending.key))?.state).toBe("reserved");
		await asOwner(t).action(api.storageActions.completeUpload, {
			uploadId: pending.uploadId,
			gatewaySecret,
		});
		await expect(
			asOwner(t, "user_bob").mutation(api.ghCard.addPost, {
				...metadata,
				uid: pending.key,
			})
		).rejects.toThrow("Upload is missing");
		await asOwner(t).mutation(api.ghCard.addPost, {
			...metadata,
			uid: pending.key,
		});
		await expect(
			asOwner(t).mutation(api.ghCard.addPost, { ...metadata, uid: pending.key })
		).rejects.toThrow("already used");
		expect((await objectFor(t, pending.key))?.state).toBe("attached");
	});

	it("checks uploaded size and gzip metadata before finalizing", async () => {
		const t = convexTest(schema, modules);
		for (const [key, headers] of [
			[
				"oversize",
				{
					"content-length": String(26 * 1024 * 1024),
					"content-type": "application/gzip",
					"content-encoding": "gzip",
				},
			],
			[
				"notgzip",
				{
					"content-length": "1024",
					"content-type": "text/plain",
					"content-encoding": "gzip",
				},
			],
			[
				"empty",
				{
					"content-length": "0",
					"content-type": "application/gzip",
					"content-encoding": "gzip",
				},
			],
		] as const) {
			const pending = await reserve(t, key);
			vi.mocked(storageRequest).mockResolvedValueOnce(
				new Response(null, { status: 200, headers })
			);
			await expect(
				asOwner(t).action(api.storageActions.completeUpload, {
					uploadId: pending.uploadId,
					gatewaySecret,
				})
			).rejects.toThrow("could not be verified");
			expect((await objectFor(t, key))?.state).toBe("reserved");
		}
	});

	it("never reserves a legacy live key or reuses a ledger key after deletion", async () => {
		const t = convexTest(schema, modules);
		await legacyPost(t);
		await expect(reserve(t, "legacy_key")).rejects.toThrow("already exists");
		const objectId = await queuedObject(t);
		await t.action(internal.storageActions.deleteObject, { objectId });
		await expect(reserve(t, "old_key")).rejects.toThrow("already exists");
		await expect(
			asOwner(t).mutation(api.ghCard.addPost, { ...metadata, uid: "old_key" })
		).rejects.toThrow("Upload is missing");
	});

	it("limits upload reservations per owner and replenishes quota", async () => {
		const t = convexTest(schema, modules);
		for (let i = 0; i < 20; i++) await reserve(t, `key_${i}`);
		await expect(reserve(t, "over_limit")).rejects.toThrow("RATE_LIMITED");
		await expect(
			reserve(t, "another_owner", "user_bob")
		).resolves.toMatchObject({ key: "another_owner" });
		vi.setSystemTime(Date.now() + 3_000);
		await expect(reserve(t, "refilled")).resolves.toMatchObject({
			key: "refilled",
		});
	});
});

describe("atomic post changes and durable cleanup", () => {
	it("preserves legacy metadata edits and rejects an unreserved replacement atomically", async () => {
		const t = convexTest(schema, modules);
		const id = await legacyPost(t);
		await asOwner(t).mutation(api.ghCard.updatePost, {
			id,
			...metadata,
			name: "Edited card",
			uid: "legacy_key",
		});
		await expect(
			asOwner(t).mutation(api.ghCard.updatePost, {
				id,
				...metadata,
				uid: "unreserved",
			})
		).rejects.toThrow("Upload is missing");
		expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
			name: "Edited card",
			bucketUrl: "legacy_key",
		});
		expect(await objectFor(t, "legacy_key")).toBeNull();
	});

	it("queues the old key in the same transaction as a replacement", async () => {
		const t = convexTest(schema, modules);
		const id = await legacyPost(t);
		await upload(t, "new_key");
		await asOwner(t).mutation(api.ghCard.updatePost, {
			id,
			...metadata,
			uid: "new_key",
		});
		expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
			bucketUrl: "new_key",
		});
		expect((await objectFor(t, "new_key"))?.state).toBe("attached");
		expect(await objectFor(t, "legacy_key")).toMatchObject({
			state: "deleting",
			clerkUserId: "user_alice",
		});
		expect(
			await t.run((ctx) =>
				ctx.db.system.query("_scheduled_functions").collect()
			)
		).toHaveLength(1);
	});

	it("deletes shares and queues cleanup atomically; a foreign user cannot delete", async () => {
		const t = convexTest(schema, modules);
		const id = await legacyPost(t);
		await asOwner(t).mutation(api.ghCard.createShare, { postId: id });
		await expect(
			asOwner(t, "user_bob").mutation(api.ghCard.deletePost, { id })
		).rejects.toThrow("Not authorized");
		expect(await objectFor(t, "legacy_key")).toBeNull();
		await asOwner(t).mutation(api.ghCard.deletePost, { id });
		expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
		expect(await t.run((ctx) => ctx.db.query("shares").collect())).toEqual([]);
		expect((await objectFor(t, "legacy_key"))?.state).toBe("deleting");
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(storageRequest).toHaveBeenCalledWith(
			"DELETE",
			"user_alice",
			"legacy_key"
		);
		expect((await objectFor(t, "legacy_key"))?.state).toBe("deleted");
	});

	it("keeps shared legacy objects until the last reference is removed", async () => {
		const t = convexTest(schema, modules);
		const first = await legacyPost(t);
		const second = await legacyPost(t);
		const otherOwner = await legacyPost(t, "legacy_key", "user_bob");
		await asOwner(t).mutation(api.ghCard.deletePost, { id: first });
		expect(await objectFor(t, "legacy_key")).toBeNull();
		await asOwner(t).mutation(api.ghCard.deletePost, { id: second });
		expect((await objectFor(t, "legacy_key"))?.state).toBe("deleting");
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(storageRequest).toHaveBeenCalledWith(
			"DELETE",
			"user_alice",
			"legacy_key"
		);
		expect(await t.run((ctx) => ctx.db.get(otherOwner))).not.toBeNull();
	});

	it("rechecks live references before issuing DELETE", async () => {
		const t = convexTest(schema, modules);
		await legacyPost(t, "old_key");
		const objectId = await queuedObject(t);
		await t.action(internal.storageActions.deleteObject, { objectId });
		expect(storageRequest).not.toHaveBeenCalled();
		expect((await objectFor(t, "old_key"))?.state).toBe("attached");
	});

	it("persists failures with backoff and treats missing objects and duplicate jobs as success", async () => {
		const t = convexTest(schema, modules);
		const objectId = await queuedObject(t);
		vi.mocked(storageRequest).mockResolvedValueOnce(
			new Response(null, { status: 503 })
		);
		await t.action(internal.storageActions.deleteObject, { objectId });
		expect(await objectFor(t, "old_key")).toMatchObject({
			state: "deleting",
			attempts: 1,
			nextAttemptAt: Date.now() + 60_000,
		});
		await t.action(internal.storageActions.deleteObject, { objectId });
		expect(storageRequest).toHaveBeenCalledTimes(1);
		vi.mocked(storageRequest).mockResolvedValueOnce(
			new Response(null, { status: 404 })
		);
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect((await objectFor(t, "old_key"))?.state).toBe("deleted");
		await t.action(internal.storageActions.deleteObject, { objectId });
		expect(storageRequest).toHaveBeenCalledTimes(2);
	});

	it("recovers crashed leases, ignores stale completions, and prevents reattachment", async () => {
		const t = convexTest(schema, modules);
		const objectId = await queuedObject(t);
		const first = await t.mutation(internal.storage.claimDeletion, {
			objectId,
		});
		expect(first?.attempt).toBe(1);
		expect(
			await t.mutation(internal.storage.claimDeletion, { objectId })
		).toBeNull();
		await expect(
			asOwner(t).mutation(api.ghCard.addPost, { ...metadata, uid: "old_key" })
		).rejects.toThrow("Upload is missing");
		vi.setSystemTime(Date.now() + CLEANUP_LEASE_MS);
		const second = await t.mutation(internal.storage.claimDeletion, {
			objectId,
		});
		expect(second?.attempt).toBe(2);
		await t.mutation(internal.storage.finishDeletion, {
			objectId,
			attempt: 1,
			succeeded: true,
		});
		expect((await objectFor(t, "old_key"))?.state).toBe("deleting");
		vi.setSystemTime(Date.now() + CLEANUP_LEASE_MS);
		await t.mutation(internal.storage.sweep, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(await objectFor(t, "old_key")).toMatchObject({
			state: "deleted",
			attempts: 3,
		});
	});

	it("expires abandoned and failed uploads while keeping live uploads and attached objects", async () => {
		const t = convexTest(schema, modules);
		await reserve(t, "failed");
		await upload(t, "abandoned");
		await upload(t, "attached");
		await asOwner(t).mutation(api.ghCard.addPost, {
			...metadata,
			uid: "attached",
		});
		vi.setSystemTime(Date.now() + UPLOAD_EXPIRY_MS);
		await reserve(t, "in_progress");
		await t.mutation(internal.storage.sweep, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect((await objectFor(t, "failed"))?.state).toBe("deleted");
		expect((await objectFor(t, "abandoned"))?.state).toBe("deleted");
		expect((await objectFor(t, "attached"))?.state).toBe("attached");
		expect((await objectFor(t, "in_progress"))?.state).toBe("reserved");
		await expect(
			asOwner(t).mutation(api.ghCard.addPost, { ...metadata, uid: "abandoned" })
		).rejects.toThrow("Upload is missing");
	});

	it("bounds each sweep and eventually drains a backlog", async () => {
		const t = convexTest(schema, modules);
		const ids: Id<"storageObjects">[] = [];
		for (let i = 0; i < CLEANUP_BATCH_SIZE + 1; i++)
			ids.push(await queuedObject(t, `key_${i}`));
		expect(await t.mutation(internal.storage.sweep, {})).toEqual({
			scheduled: CLEANUP_BATCH_SIZE,
		});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(storageRequest).toHaveBeenCalledTimes(CLEANUP_BATCH_SIZE);
		expect(await t.mutation(internal.storage.sweep, {})).toEqual({
			scheduled: 1,
		});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(await t.run((ctx) => ctx.db.get(ids.at(-1)!))).toMatchObject({
			state: "deleted",
		});
	});
});
