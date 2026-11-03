import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { storageRequest } from "./storageR2";
import { MISSING_GRACE_MS } from "./storageReconcile";
import { PREVIEW_VERSION } from "../src/types/preview";

vi.mock("./storageR2", () => ({ storageRequest: vi.fn() }));

const modules = import.meta.glob([
	"./**/*.ts",
	"./_generated/*.js",
	"!./**/*.test.ts",
]);
type Backend = TestConvex<typeof schema>;
const ownerId = "user_alice";
const previewData = {
	count: 0,
	inputs: { sliders: 0, toggles: 0, lists: 0 },
	keyComponents: [],
	scripts: [],
	scriptCount: 0,
	plugins: [],
	pluginCount: 0,
	nodes: [],
	edges: [],
	groups: [],
};

function seedPost(
	t: Backend,
	key: string,
	overrides: Partial<Omit<Doc<"post">, "_id" | "_creationTime">> = {}
) {
	return t.run((ctx) =>
		ctx.db.insert("post", {
			name: `Card ${key}`,
			clerkUserId: ownerId,
			bucketUrl: key,
			dateCreated: new Date().toISOString(),
			dateUpdated: new Date().toISOString(),
			...overrides,
		})
	);
}

function apply(t: Backend, overrideBreaker = true) {
	return t.action(internal.storageReconcile.run, {
		mode: "apply",
		overrideBreaker,
	});
}

function snapshot(t: Backend) {
	return t.run(async (ctx) => ({
		posts: await ctx.db.query("post").collect(),
		shares: await ctx.db.query("shares").collect(),
		previews: await ctx.db.query("postPreviews").collect(),
		claims: await ctx.db.query("previewBackfillClaims").collect(),
		objects: await ctx.db.query("storageObjects").collect(),
		jobs: await ctx.db.system.query("_scheduled_functions").collect(),
	}));
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-11-01T03:17:00Z"));
	vi.mocked(storageRequest)
		.mockReset()
		.mockResolvedValue(new Response(null, { status: 200 }));
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("storage reconciliation", () => {
	it("reports all classifications without marking, clearing, or deleting", async () => {
		const t = convexTest(schema, modules);
		const oldMark = Date.now() - MISSING_GRACE_MS;
		const missing = await seedPost(t, "missing", {
			storageMissingSince: oldMark,
		});
		const firstMiss = await seedPost(t, "first_miss");
		await seedPost(t, "present", { storageMissingSince: oldMark });
		await seedPost(t, "unknown", { storageMissingSince: oldMark });
		await seedPost(t, "legacy", {
			clerkUserId: undefined,
			storageMissingSince: oldMark,
		});
		await seedPost(t, "../bad", { storageMissingSince: oldMark });
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, {
					status: key === "present" ? 200 : key === "unknown" ? 500 : 404,
				})
		);
		const before = await snapshot(t);
		const result = await t.action(internal.storageReconcile.run, {
			mode: "report",
			overrideBreaker: true,
		});
		expect(result).toEqual({
			mode: "report",
			checked: 3,
			present: 1,
			missing: 2,
			unknown: 1,
			unverifiable: 2,
			breakerTripped: true,
			marked: 0,
			cleared: 0,
			deleted: 0,
			missingPosts: [
				{ postId: missing, name: "Card missing", missingSince: oldMark },
				{ postId: firstMiss, name: "Card first_miss" },
			],
		});
		expect(await snapshot(t)).toEqual(before);
		expect(storageRequest).toHaveBeenCalledTimes(4);
	});

	it("marks the first miss, waits six days, then cascades and queues durable deletion", async () => {
		const t = convexTest(schema, modules);
		const postId = await seedPost(t, "missing");
		await t.run(async (ctx) => {
			await ctx.db.insert("shares", {
				postId,
				clerkUserId: ownerId,
				shareToken: "a".repeat(15),
				createdAt: new Date().toISOString(),
				expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
			});
			await ctx.db.insert("postPreviews", {
				clerkUserId: ownerId,
				storageKey: "missing",
				version: PREVIEW_VERSION,
				data: previewData,
			});
			for (const version of [0, PREVIEW_VERSION]) {
				await ctx.db.insert("previewBackfillClaims", {
					clerkUserId: ownerId,
					storageKey: "missing",
					version,
				});
			}
		});
		vi.mocked(storageRequest).mockResolvedValue(
			new Response(null, { status: 404 })
		);
		const markedAt = Date.now();
		expect(await apply(t)).toMatchObject({ marked: 1, cleared: 0, deleted: 0 });
		expect(await t.run((ctx) => ctx.db.get(postId))).toMatchObject({
			storageMissingSince: markedAt,
		});
		vi.setSystemTime(markedAt + MISSING_GRACE_MS - 1);
		expect(await apply(t)).toMatchObject({ marked: 0, cleared: 0, deleted: 0 });
		expect(await t.run((ctx) => ctx.db.get(postId))).toMatchObject({
			storageMissingSince: markedAt,
		});
		vi.setSystemTime(markedAt + MISSING_GRACE_MS);
		expect(await apply(t)).toMatchObject({ marked: 0, cleared: 0, deleted: 1 });
		const state = await snapshot(t);
		expect(state.posts).toEqual([]);
		expect(state.shares).toEqual([]);
		expect(state.previews).toEqual([]);
		expect(state.claims).toEqual([]);
		expect(state.objects).toMatchObject([
			{ clerkUserId: ownerId, key: "missing", state: "deleting", attempts: 0 },
		]);
		expect(state.jobs).toHaveLength(1);
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(storageRequest).toHaveBeenLastCalledWith(
			"DELETE",
			ownerId,
			"missing"
		);
		expect((await snapshot(t)).objects[0].state).toBe("deleted");
	});

	it("clears a mark when the object is present, restarting the grace period on a later miss", async () => {
		const t = convexTest(schema, modules);
		const id = await seedPost(t, "recovered", { storageMissingSince: 0 });
		expect(await apply(t, false)).toMatchObject({
			present: 1,
			cleared: 1,
			marked: 0,
			deleted: 0,
			breakerTripped: false,
		});
		expect(await t.run((ctx) => ctx.db.get(id))).not.toHaveProperty(
			"storageMissingSince"
		);
		vi.mocked(storageRequest).mockResolvedValue(
			new Response(null, { status: 404 })
		);
		expect(await apply(t)).toMatchObject({ marked: 1, deleted: 0 });
	});

	it.each([403, 500, "network", "timeout", "configuration"] as const)(
		"treats %s as unknown without marking, deleting, or clearing",
		async (failure) => {
			const t = convexTest(schema, modules);
			await seedPost(t, "unmarked");
			await seedPost(t, "marked", {
				storageMissingSince: Date.now() - MISSING_GRACE_MS,
			});
			vi.mocked(storageRequest).mockImplementation(async () => {
				if (typeof failure === "string") throw new Error(failure);
				return new Response(null, { status: failure });
			});
			const before = await snapshot(t);
			expect(await apply(t)).toMatchObject({
				checked: 0,
				unknown: 2,
				breakerTripped: true,
				marked: 0,
				cleared: 0,
				deleted: 0,
			});
			expect(await snapshot(t)).toEqual(before);
		}
	);

	it("blocks all writes on all-missing scans, with an explicit override", async () => {
		const t = convexTest(schema, modules);
		await seedPost(t, "missing");
		vi.mocked(storageRequest).mockResolvedValue(
			new Response(null, { status: 404 })
		);
		const before = await snapshot(t);
		expect(await apply(t, false)).toMatchObject({
			missing: 1,
			breakerTripped: true,
			marked: 0,
		});
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("breaker tripped"),
			expect.objectContaining({ checked: 1, missing: 1 })
		);
		expect(await snapshot(t)).toEqual(before);
		expect(await apply(t)).toMatchObject({
			missing: 1,
			breakerTripped: true,
			marked: 1,
		});
	});

	it.each(["empty", "unverifiable"])(
		"trips the zero-checked breaker for %s libraries",
		async (kind) => {
			const t = convexTest(schema, modules);
			if (kind === "unverifiable")
				await seedPost(t, "legacy", { clerkUserId: undefined });
			const before = await snapshot(t);
			expect(await apply(t, false)).toMatchObject({
				checked: 0,
				breakerTripped: true,
				marked: 0,
				cleared: 0,
				deleted: 0,
			});
			expect(await snapshot(t)).toEqual(before);
			expect(storageRequest).not.toHaveBeenCalled();
		}
	);

	it("evaluates the unknown breaker after the full scan and before any page writes", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			for (let i = 0; i < 150; i++) {
				await ctx.db.insert("post", {
					name: "Card",
					clerkUserId: ownerId,
					bucketUrl: `file_${i}`,
					dateCreated: "",
					dateUpdated: "",
					storageMissingSince: 0,
				});
			}
		});
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: Number(key.slice(5)) < 100 ? 200 : 403 })
		);
		const before = await snapshot(t);
		expect(await apply(t, false)).toMatchObject({
			checked: 100,
			present: 100,
			unknown: 50,
			breakerTripped: true,
			cleared: 0,
		});
		expect(await snapshot(t)).toEqual(before);
		expect(storageRequest).toHaveBeenCalledTimes(150);
	});

	it.each(["missing", "unknown"])(
		"allows exactly 20 percent %s",
		async (classification) => {
			const t = convexTest(schema, modules);
			for (let i = 0; i < 5; i++)
				await seedPost(t, `file_${i}`, { storageMissingSince: 0 });
			vi.mocked(storageRequest).mockImplementation(
				async (_method, _owner, key) =>
					new Response(null, {
						status:
							key === "file_4"
								? classification === "missing"
									? 404
									: 500
								: 200,
					})
			);
			expect(await apply(t, false)).toMatchObject({
				breakerTripped: false,
				cleared: 4,
				deleted: classification === "missing" ? 1 : 0,
			});
		}
	);

	it("ignores stale checks after file replacement, owner changes, or deletion", async () => {
		const t = convexTest(schema, modules);
		const marked = await seedPost(t, "new_marked", { storageMissingSince: 0 });
		const unmarked = await seedPost(t, "new_unmarked");
		const present = await seedPost(t, "new_present", {
			storageMissingSince: 0,
		});
		const foreign = await seedPost(t, "old", {
			clerkUserId: "user_bob",
			storageMissingSince: 0,
		});
		const gone = await seedPost(t, "gone");
		await t.run((ctx) => ctx.db.delete(gone));
		const before = await snapshot(t);
		expect(
			await t.mutation(internal.storageReconcile.applyBatch, {
				entries: [
					...[marked, unmarked, foreign, gone].map((postId) => ({
						postId,
						bucketUrl: "old",
						clerkUserId: ownerId,
						status: "missing" as const,
					})),
					{
						postId: present,
						bucketUrl: "old",
						clerkUserId: ownerId,
						status: "present",
					},
				],
			})
		).toEqual({ marked: 0, cleared: 0, deleted: 0 });
		expect(await snapshot(t)).toEqual(before);
	});

	it("leaves legacy rows without owners or with invalid keys untouched", async () => {
		const t = convexTest(schema, modules);
		await seedPost(t, "legacy", {
			clerkUserId: undefined,
			storageMissingSince: 0,
		});
		await seedPost(t, "../invalid", { storageMissingSince: 0 });
		await seedPost(t, "present");
		const before = await snapshot(t);
		expect(await apply(t, false)).toMatchObject({
			checked: 1,
			present: 1,
			unverifiable: 2,
			breakerTripped: false,
			marked: 0,
			cleared: 0,
			deleted: 0,
		});
		expect(await snapshot(t)).toEqual(before);
		expect(storageRequest).toHaveBeenCalledExactlyOnceWith(
			"HEAD",
			ownerId,
			"present"
		);
	});

	it("preserves a mark on rename and clears it when updatePost replaces the file", async () => {
		const t = convexTest(schema, modules);
		const id = await seedPost(t, "old", { storageMissingSince: 0 });
		const owner = t.withIdentity({ id: ownerId });
		await owner.mutation(api.ghCard.updatePost, { id, name: "Renamed" });
		expect(await t.run((ctx) => ctx.db.get(id))).toHaveProperty(
			"storageMissingSince",
			0
		);
		await t.run((ctx) =>
			ctx.db.insert("storageObjects", {
				clerkUserId: ownerId,
				key: "replacement",
				state: "uploaded",
				expiresAt: Date.now() + 60000,
				attempts: 0,
			})
		);
		await owner.mutation(api.ghCard.updatePost, { id, uid: "replacement" });
		const post = await t.run((ctx) => ctx.db.get(id));
		expect(post).toHaveProperty("bucketUrl", "replacement");
		expect(post).not.toHaveProperty("storageMissingSince");
	});

	it("checks and applies every page and limits HEAD concurrency to five", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			for (let i = 0; i < 205; i++) {
				await ctx.db.insert("post", {
					name: "Card",
					bucketUrl: `file_${i}`,
					clerkUserId: ownerId,
					dateCreated: "",
					dateUpdated: "",
					storageMissingSince: 0,
				});
			}
		});
		let active = 0;
		let peak = 0;
		vi.mocked(storageRequest).mockImplementation(async () => {
			active++;
			peak = Math.max(peak, active);
			await Promise.resolve();
			active--;
			return new Response(null, { status: 200 });
		});
		expect(await apply(t, false)).toMatchObject({
			checked: 205,
			present: 205,
			cleared: 205,
			breakerTripped: false,
		});
		expect(storageRequest).toHaveBeenCalledTimes(205);
		expect(
			new Set(vi.mocked(storageRequest).mock.calls.map((call) => call[2])).size
		).toBe(205);
		expect(peak).toBe(5);
		expect(
			(await snapshot(t)).posts.every(
				(post) => post.storageMissingSince === undefined
			)
		).toBe(true);
	});

	it("caps the report list at 200 while counting all missing posts", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			for (let i = 0; i < 205; i++) {
				await ctx.db.insert("post", {
					name: "Card",
					bucketUrl: `file_${i}`,
					clerkUserId: ownerId,
					dateCreated: "",
					dateUpdated: "",
				});
			}
		});
		vi.mocked(storageRequest).mockResolvedValue(
			new Response(null, { status: 404 })
		);
		const result = await t.action(internal.storageReconcile.run, {
			mode: "report",
		});
		expect(result).toMatchObject({
			checked: 205,
			missing: 205,
			breakerTripped: true,
			marked: 0,
			deleted: 0,
		});
		expect(result.missingPosts).toHaveLength(200);
		expect(storageRequest).toHaveBeenCalledTimes(205);
	});

	it("omits internal marks from library and shared-link responses", async () => {
		const t = convexTest(schema, modules);
		const postId = await seedPost(t, "file", { storageMissingSince: 0 });
		const owner = t.withIdentity({ id: ownerId });
		const all = await owner.query(api.ghCard.getAll, {});
		const page = await owner.query(api.ghCard.listPage, {
			paginationOpts: { numItems: 10, cursor: null },
		});
		expect(all).toHaveLength(1);
		expect(all[0]).not.toHaveProperty("storageMissingSince");
		expect(page.page[0]).not.toHaveProperty("storageMissingSince");
		const { shareToken } = await owner.mutation(api.ghCard.createShare, {
			postId,
		});
		const resolved = await t.mutation(internal.shareAccess.consumeAndResolve, {
			clientKey: "a".repeat(64),
			shareToken,
		});
		expect(resolved.status).toBe("ok");
		if (resolved.status === "ok")
			expect(resolved.sharedPost.post).toEqual({ name: "Card file" });
	});
});
