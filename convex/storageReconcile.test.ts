import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { storageRequest } from "./storageR2";
import { MISSING_GRACE_MS, SCAN_BUDGET_MS } from "./storageReconcile";
import { PREVIEW_VERSION } from "../src/types/preview";

vi.mock("./storageR2", async (importOriginal) => ({
	...(await importOriginal<typeof import("./storageR2")>()),
	storageRequest: vi.fn(),
}));

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

function apply(t: Backend, confirmPostIds?: Id<"post">[]) {
	return t.action(internal.storageReconcile.run, {
		mode: "apply",
		confirmPostIds,
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

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-11-01T03:17:00Z"));
	vi.mocked(storageRequest)
		.mockReset()
		.mockResolvedValue(new Response(null, { status: 200 }));
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
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
			confirmPostIds: [missing],
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
			confirmed: 0,
			reverifyUnknown: 0,
			failedBatches: 0,
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
		const healthy = await seedPost(t, "healthy");
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
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "healthy" ? 200 : 404 })
		);
		const markedAt = Date.now();
		expect(await apply(t, [postId])).toMatchObject({
			marked: 1,
			cleared: 0,
			deleted: 0,
			confirmed: 1,
		});
		expect(await t.run((ctx) => ctx.db.get(postId))).toMatchObject({
			storageMissingSince: markedAt,
		});
		vi.setSystemTime(markedAt + MISSING_GRACE_MS - 1);
		expect(await apply(t, [postId])).toMatchObject({
			marked: 0,
			cleared: 0,
			deleted: 0,
		});
		expect(await t.run((ctx) => ctx.db.get(postId))).toMatchObject({
			storageMissingSince: markedAt,
		});
		vi.setSystemTime(markedAt + MISSING_GRACE_MS);
		expect(await apply(t, [postId])).toMatchObject({
			marked: 0,
			cleared: 0,
			deleted: 1,
		});
		const state = await snapshot(t);
		expect(state.posts.map((post) => post._id)).toEqual([healthy]);
		expect(state.shares).toEqual([]);
		expect(state.previews).toEqual([]);
		expect(state.claims).toEqual([]);
		expect(state.objects).toMatchObject([
			{ clerkUserId: ownerId, key: "missing", state: "deleting", attempts: 0 },
		]);
		expect(state.jobs).toHaveLength(1);
		expect(console.warn).toHaveBeenCalledTimes(2);
		for (const operation of ["marked", "deleted"]) {
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining(operation),
				{ postId, name: "Card missing", key: "missing" }
			);
		}
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
		expect(await apply(t)).toMatchObject({
			present: 1,
			cleared: 1,
			marked: 0,
			deleted: 0,
			breakerTripped: false,
		});
		expect(await t.run((ctx) => ctx.db.get(id))).not.toHaveProperty(
			"storageMissingSince"
		);
		await seedPost(t, "healthy");
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "healthy" ? 200 : 404 })
		);
		expect(await apply(t, [id])).toMatchObject({ marked: 1, deleted: 0 });
	});

	it.each([403, 500, "network", "timeout", "configuration"] as const)(
		"treats %s as unknown without marking, deleting, or clearing",
		async (failure) => {
			const t = convexTest(schema, modules);
			const unmarked = await seedPost(t, "unmarked");
			const marked = await seedPost(t, "marked", {
				storageMissingSince: Date.now() - MISSING_GRACE_MS,
			});
			vi.mocked(storageRequest).mockImplementation(async () => {
				if (typeof failure === "string") throw new Error(failure);
				return new Response(null, { status: failure });
			});
			const before = await snapshot(t);
			for (const confirmPostIds of [undefined, [unmarked, marked]]) {
				expect(await apply(t, confirmPostIds)).toMatchObject({
					checked: 0,
					unknown: 2,
					breakerTripped: true,
					marked: 0,
					cleared: 0,
					deleted: 0,
				});
				expect(await snapshot(t)).toEqual(before);
			}
			expect(console.error).toHaveBeenCalledTimes(2);
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("no present object"),
				expect.objectContaining({ checked: 0, unknown: 2 })
			);
		}
	);

	it("refuses all-missing scans even with explicit confirmation", async () => {
		const t = convexTest(schema, modules);
		const missing = await seedPost(t, "missing");
		const matured = await seedPost(t, "matured", { storageMissingSince: 0 });
		vi.mocked(storageRequest).mockResolvedValue(
			new Response(null, { status: 404 })
		);
		const before = await snapshot(t);
		expect(await apply(t)).toMatchObject({
			missing: 2,
			breakerTripped: true,
			marked: 0,
		});
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("no present object"),
			expect.objectContaining({ checked: 2, missing: 2 })
		);
		expect(await snapshot(t)).toEqual(before);
		expect(await apply(t, [missing, matured])).toMatchObject({
			missing: 2,
			breakerTripped: true,
			marked: 0,
			deleted: 0,
			confirmed: 0,
		});
		expect(await snapshot(t)).toEqual(before);
	});

	it.each(["empty", "unverifiable"])(
		"returns a clean summary without writes or error logs for %s libraries",
		async (kind) => {
			const t = convexTest(schema, modules);
			if (kind === "unverifiable") {
				await seedPost(t, "legacy", {
					clerkUserId: undefined,
					storageMissingSince: 0,
				});
				await seedPost(t, "../invalid", { storageMissingSince: 0 });
			}
			const before = await snapshot(t);
			expect(await apply(t)).toEqual({
				mode: "apply",
				checked: 0,
				present: 0,
				missing: 0,
				unknown: 0,
				unverifiable: kind === "unverifiable" ? 2 : 0,
				breakerTripped: false,
				missingPosts: [],
				confirmed: 0,
				reverifyUnknown: 0,
				failedBatches: 0,
				marked: 0,
				cleared: 0,
				deleted: 0,
			});
			expect(await snapshot(t)).toEqual(before);
			expect(storageRequest).not.toHaveBeenCalled();
			expect(console.error).not.toHaveBeenCalled();
		}
	);

	it("evaluates the unknown breaker after the full scan but still clears present marks", async () => {
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
		expect(await apply(t)).toMatchObject({
			checked: 100,
			present: 100,
			unknown: 50,
			breakerTripped: true,
			cleared: 100,
		});
		const state = await snapshot(t);
		expect(
			state.posts.filter((post) => post.storageMissingSince === undefined)
		).toHaveLength(100);
		expect(
			state.posts.filter((post) => post.storageMissingSince === 0)
		).toHaveLength(50);
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
			expect(await apply(t)).toMatchObject({
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
		expect(await apply(t)).toMatchObject({
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
		expect(await apply(t)).toMatchObject({
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

	it("re-verifies a matured missing card and clears its mark if the object was restored", async () => {
		const t = convexTest(schema, modules);
		const id = await seedPost(t, "restored", { storageMissingSince: 0 });
		await seedPost(t, "healthy");
		let checks = 0;
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, {
					status: key === "restored" && checks++ === 0 ? 404 : 200,
				})
		);
		expect(await apply(t, [id])).toMatchObject({
			present: 1,
			missing: 1,
			confirmed: 1,
			cleared: 1,
			deleted: 0,
			reverifyUnknown: 0,
		});
		expect(await t.run((ctx) => ctx.db.get(id))).not.toHaveProperty(
			"storageMissingSince"
		);
		expect(
			vi
				.mocked(storageRequest)
				.mock.calls.filter((call) => call[2] === "restored")
		).toHaveLength(2);
		expect((await snapshot(t)).objects).toEqual([]);
	});

	it.each([403, 500, "error"] as const)(
		"leaves a matured mark untouched when re-verification returns %s",
		async (failure) => {
			const t = convexTest(schema, modules);
			const id = await seedPost(t, "uncertain", { storageMissingSince: 0 });
			await seedPost(t, "healthy");
			let checks = 0;
			vi.mocked(storageRequest).mockImplementation(
				async (_method, _owner, key) => {
					if (key === "healthy") return new Response(null, { status: 200 });
					if (checks++ === 0) return new Response(null, { status: 404 });
					if (failure === "error") throw new Error("network failure");
					return new Response(null, { status: failure });
				}
			);
			const before = await snapshot(t);
			expect(await apply(t, [id])).toMatchObject({
				missing: 1,
				unknown: 0,
				reverifyUnknown: 1,
				marked: 0,
				cleared: 0,
				deleted: 0,
			});
			expect(await snapshot(t)).toEqual(before);
			expect(console.warn).not.toHaveBeenCalled();
		}
	);

	it("clears an old mark during a tripped run, then freshly marks a subsequent miss", async () => {
		const t = convexTest(schema, modules);
		const recovered = await seedPost(t, "recovered", {
			storageMissingSince: 0,
		});
		const missing = await seedPost(t, "missing");
		await seedPost(t, "healthy");
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "missing" ? 404 : 200 })
		);
		expect(await apply(t)).toMatchObject({
			breakerTripped: true,
			confirmed: 0,
			cleared: 1,
			marked: 0,
			deleted: 0,
		});
		expect(await t.run((ctx) => ctx.db.get(recovered))).not.toHaveProperty(
			"storageMissingSince"
		);
		expect(await t.run((ctx) => ctx.db.get(missing))).not.toHaveProperty(
			"storageMissingSince"
		);
		vi.setSystemTime(Date.now() + 1000);
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "healthy" ? 200 : 404 })
		);
		expect(await apply(t, [recovered])).toMatchObject({
			breakerTripped: true,
			confirmed: 1,
			marked: 1,
			deleted: 0,
		});
		expect(await t.run((ctx) => ctx.db.get(recovered))).toHaveProperty(
			"storageMissingSince",
			Date.now()
		);
	});

	it("accepts only listed missing IDs during tripped runs, deduplicating and ignoring unrelated IDs", async () => {
		const t = convexTest(schema, modules);
		const confirmed = await seedPost(t, "confirmed");
		const unconfirmed = await seedPost(t, "unconfirmed");
		const oldUnconfirmed = await seedPost(t, "old_unconfirmed", {
			storageMissingSince: 0,
		});
		const healthy = await seedPost(t, "healthy", { storageMissingSince: 0 });
		const gone = await seedPost(t, "gone");
		await t.run((ctx) => ctx.db.delete(gone));
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "healthy" ? 200 : 404 })
		);
		expect(await apply(t, [confirmed, confirmed, healthy, gone])).toMatchObject(
			{
				breakerTripped: true,
				confirmed: 1,
				marked: 1,
				cleared: 1,
				deleted: 0,
			}
		);
		expect(await t.run((ctx) => ctx.db.get(unconfirmed))).not.toHaveProperty(
			"storageMissingSince"
		);
		expect(await t.run((ctx) => ctx.db.get(oldUnconfirmed))).toHaveProperty(
			"storageMissingSince",
			0
		);
		expect(
			vi
				.mocked(storageRequest)
				.mock.calls.filter((call) => call[2] === "old_unconfirmed")
		).toHaveLength(1);
	});

	it("ignores confirmation IDs when the breaker does not trip", async () => {
		const t = convexTest(schema, modules);
		const missing = await seedPost(t, "missing");
		const present = [];
		for (let i = 0; i < 4; i++) present.push(await seedPost(t, `present_${i}`));
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "missing" ? 404 : 200 })
		);
		expect(await apply(t, present)).toMatchObject({
			breakerTripped: false,
			confirmed: 0,
			marked: 1,
		});
		expect(await t.run((ctx) => ctx.db.get(missing))).toHaveProperty(
			"storageMissingSince",
			Date.now()
		);
	});

	it("trips on 16 missing plus 19 unknown out of 100 attempts", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			for (let i = 0; i < 100; i++) {
				await ctx.db.insert("post", {
					name: "Card",
					bucketUrl: `file_${i}`,
					clerkUserId: ownerId,
					dateCreated: "",
					dateUpdated: "",
				});
			}
		});
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) => {
				const i = Number(key.slice(5));
				return new Response(null, {
					status: i < 16 ? 404 : i < 35 ? 500 : 200,
				});
			}
		);
		const before = await snapshot(t);
		expect(await apply(t)).toMatchObject({
			checked: 81,
			present: 65,
			missing: 16,
			unknown: 19,
			breakerTripped: true,
			marked: 0,
			deleted: 0,
		});
		expect(await snapshot(t)).toEqual(before);
	});

	it.each(["initial", "reverification"])(
		"returns the appropriate abort marker and committed counts when %s exceeds eight minutes",
		async (phase) => {
			const t = convexTest(schema, modules);
			const id = await seedPost(t, "candidate", { storageMissingSince: 0 });
			const healthy = await seedPost(t, "healthy", { storageMissingSince: 0 });
			const start = Date.now();
			let candidateChecks = 0;
			vi.mocked(storageRequest).mockImplementation(
				async (_method, _owner, key) => {
					if (key === "healthy") return new Response(null, { status: 200 });
					candidateChecks++;
					if (phase === "initial" || candidateChecks === 2)
						vi.setSystemTime(start + SCAN_BUDGET_MS + 1);
					return new Response(null, { status: 404 });
				}
			);
			const before = await snapshot(t);
			expect(await apply(t, [id])).toMatchObject({
				aborted:
					phase === "initial" ? "time_budget" : "time_budget_during_apply",
				marked: 0,
				cleared: phase === "initial" ? 0 : 1,
				deleted: 0,
				failedBatches: 0,
			});
			if (phase === "initial") expect(await snapshot(t)).toEqual(before);
			else {
				expect(await t.run((ctx) => ctx.db.get(healthy))).not.toHaveProperty(
					"storageMissingSince"
				);
				expect(await t.run((ctx) => ctx.db.get(id))).toHaveProperty(
					"storageMissingSince",
					0
				);
				expect((await snapshot(t)).objects).toEqual([]);
			}
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("time budget"),
				expect.any(Object)
			);
			expect(console.warn).not.toHaveBeenCalled();
			expect(candidateChecks).toBe(phase === "initial" ? 1 : 2);
		}
	);

	it("isolates a per-card deletion failure while other cards and batched clears commit", async () => {
		const t = convexTest(schema, modules);
		const bad = await seedPost(t, "bad", { storageMissingSince: 0 });
		const good = await seedPost(t, "good", { storageMissingSince: 0 });
		await t.run(async (ctx) => {
			// Historical duplicate ledger rows make cleanup's .unique() fail.
			for (let i = 0; i < 2; i++) {
				await ctx.db.insert("storageObjects", {
					clerkUserId: ownerId,
					key: "bad",
					state: "attached",
					attempts: 0,
				});
			}
			for (let i = 0; i < 104; i++) {
				await ctx.db.insert("post", {
					name: "Card",
					bucketUrl: `healthy_${i}`,
					clerkUserId: ownerId,
					dateCreated: "",
					dateUpdated: "",
					storageMissingSince: 0,
				});
			}
		});
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, {
					status: key === "bad" || key === "good" ? 404 : 200,
				})
		);
		expect(await apply(t)).toMatchObject({
			failedBatches: 1,
			deleted: 1,
			marked: 0,
			cleared: 104,
			breakerTripped: false,
		});
		const state = await snapshot(t);
		expect(state.posts).toHaveLength(105);
		expect(await t.run((ctx) => ctx.db.get(good))).toBeNull();
		expect(await t.run((ctx) => ctx.db.get(bad))).toHaveProperty(
			"storageMissingSince",
			0
		);
		expect(
			state.posts.filter((post) => post.storageMissingSince === undefined)
		).toHaveLength(104);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("batch failed"),
			expect.objectContaining({ postId: bad })
		);
	});

	it("classifies invalid owners as unverifiable and also rejects them in applyBatch", async () => {
		const t = convexTest(schema, modules);
		const invalid = [];
		for (const [i, clerkUserId] of [
			"user/alice",
			"user@example.com",
			"",
			"user alice",
		].entries()) {
			const postId = await seedPost(t, `file_${i}`, {
				clerkUserId,
				storageMissingSince: 0,
			});
			invalid.push({ postId, clerkUserId, bucketUrl: `file_${i}` });
		}
		await seedPost(t, "healthy");
		const before = await snapshot(t);
		expect(await apply(t)).toMatchObject({
			checked: 1,
			present: 1,
			unverifiable: 4,
			unknown: 0,
			breakerTripped: false,
		});
		expect(storageRequest).toHaveBeenCalledExactlyOnceWith(
			"HEAD",
			ownerId,
			"healthy"
		);
		for (const status of ["present", "missing"] as const) {
			expect(
				await t.mutation(internal.storageReconcile.applyBatch, {
					entries: invalid.map((entry) => ({
						...entry,
						status,
						deleteVerified: true,
					})),
				})
			).toEqual({ marked: 0, cleared: 0, deleted: 0 });
		}
		expect(await snapshot(t)).toEqual(before);
	});

	it("limits matured re-verification to five concurrent requests", async () => {
		const t = convexTest(schema, modules);
		const ids = [];
		for (let i = 0; i < 12; i++)
			ids.push(await seedPost(t, `missing_${i}`, { storageMissingSince: 0 }));
		await seedPost(t, "healthy");
		let active = 0;
		let reverifyPeak = 0;
		const calls = new Map<string, number>();
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) => {
				const checks = (calls.get(key) ?? 0) + 1;
				calls.set(key, checks);
				if (checks === 2) {
					active++;
					reverifyPeak = Math.max(reverifyPeak, active);
					await Promise.resolve();
					active--;
				}
				return new Response(null, { status: key === "healthy" ? 200 : 404 });
			}
		);
		expect(await apply(t, ids)).toMatchObject({
			deleted: 12,
			confirmed: 12,
			reverifyUnknown: 0,
		});
		expect(reverifyPeak).toBe(5);
		expect([...calls.values()].filter((count) => count === 2)).toHaveLength(12);
	});

	it("does not delete a mark that matures after candidate selection without a second HEAD", async () => {
		const t = convexTest(schema, modules);
		const id = await seedPost(t, "not_yet_mature", {
			storageMissingSince: Date.now() - MISSING_GRACE_MS + 1,
		});
		vi.setSystemTime(Date.now() + 2);
		const before = await snapshot(t);
		expect(
			await t.mutation(internal.storageReconcile.applyBatch, {
				entries: [
					{
						postId: id,
						bucketUrl: "not_yet_mature",
						clerkUserId: ownerId,
						status: "missing",
					},
				],
			})
		).toEqual({ marked: 0, cleared: 0, deleted: 0 });
		expect(await snapshot(t)).toEqual(before);
	});

	it("commits A's deletion while B's final HEAD is still pending, then processes B independently", async () => {
		const t = convexTest(schema, modules);
		const a = await seedPost(t, "card_a", { storageMissingSince: 0 });
		const b = await seedPost(t, "card_b", { storageMissingSince: 0 });
		await seedPost(t, "healthy");
		const bPending = deferred<void>();
		const bHead = deferred<Response>();
		const calls = new Map<string, number>();
		let restoredA = false;
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) => {
				const count = (calls.get(key) ?? 0) + 1;
				calls.set(key, count);
				if (key === "healthy" || (key === "card_a" && restoredA))
					return new Response(null, { status: 200 });
				if (key === "card_b" && count === 2) {
					bPending.resolve();
					return bHead.promise;
				}
				return new Response(null, { status: 404 });
			}
		);
		const running = apply(t, [a, b]);
		try {
			await bPending.promise;
			// Observe committed database state, not the mutation's pre-commit log.
			// B remains blocked throughout this assertion; the old bulk HEAD pass
			// would leave A undeleted until B was released.
			await vi.waitFor(async () =>
				expect(await t.run((ctx) => ctx.db.get(a))).toBeNull()
			);
			restoredA = true;
			expect(await t.run((ctx) => ctx.db.get(b))).not.toBeNull();
			expect(calls.get("card_a")).toBe(2);
			bHead.resolve(new Response(null, { status: 404 }));
			expect(await running).toMatchObject({
				deleted: 2,
				failedBatches: 0,
				reverifyUnknown: 0,
			});
			expect(await t.run((ctx) => ctx.db.get(b))).toBeNull();
		} finally {
			bHead.resolve(new Response(null, { status: 404 }));
			await running;
		}
	});

	it("stops starting deletion HEADs on budget expiry and returns earlier committed counts", async () => {
		const t = convexTest(schema, modules);
		const ids: Id<"post">[] = [];
		for (let i = 0; i < 12; i++)
			ids.push(await seedPost(t, `missing_${i}`, { storageMissingSince: 0 }));
		await seedPost(t, "healthy", { storageMissingSince: 0 });
		const start = Date.now();
		const heldHeads = deferred<Response>();
		const sixthStarted = deferred<void>();
		const calls = new Map<string, number>();
		const secondHeads: string[] = [];
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) => {
				const count = (calls.get(key) ?? 0) + 1;
				calls.set(key, count);
				if (key === "healthy") return new Response(null, { status: 200 });
				if (count === 2) {
					secondHeads.push(key);
					if (secondHeads.length === 6) sixthStarted.resolve();
					if (key !== "missing_0") return heldHeads.promise;
				}
				return new Response(null, { status: 404 });
			}
		);
		const running = apply(t, ids);
		try {
			// Five workers start; only A finishes, commits, and starts a sixth
			// HEAD. All other HEADs are held so no further mutation can start.
			await sixthStarted.promise;
			expect(await t.run((ctx) => ctx.db.get(ids[0]))).toBeNull();
			vi.setSystemTime(start + SCAN_BUDGET_MS + 1);
			heldHeads.resolve(new Response(null, { status: 404 }));
			expect(await running).toMatchObject({
				aborted: "time_budget_during_apply",
				deleted: 1,
				cleared: 1,
				marked: 0,
				failedBatches: 0,
			});
			expect(secondHeads).toHaveLength(6);
			const state = await snapshot(t);
			expect(state.posts).toHaveLength(12);
			expect(
				state.posts.filter((post) => post.storageMissingSince === 0)
			).toHaveLength(11);
			expect(state.objects).toMatchObject([
				{ key: "missing_0", state: "deleting" },
			]);
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("during apply"),
				expect.any(Object)
			);
		} finally {
			heldHeads.resolve(new Response(null, { status: 404 }));
			await running;
		}
	});

	it("stops between non-deletion batches when the budget expires before phase 2", async () => {
		const t = convexTest(schema, modules);
		await seedPost(t, "healthy", { storageMissingSince: 0 });
		const missing = [];
		for (let i = 0; i < 205; i++)
			missing.push(await seedPost(t, `missing_${i}`));
		const candidate = await seedPost(t, "matured", { storageMissingSince: 0 });
		const start = Date.now();
		vi.mocked(storageRequest).mockImplementation(
			async (_method, _owner, key) =>
				new Response(null, { status: key === "healthy" ? 200 : 404 })
		);
		// The first transaction still commits atomically. Expiry prevents the
		// next batch and the deletion phase from starting.
		vi.mocked(console.warn).mockImplementationOnce(() =>
			vi.setSystemTime(start + SCAN_BUDGET_MS + 1)
		);
		expect(await apply(t, [...missing, candidate])).toMatchObject({
			aborted: "time_budget_during_apply",
			marked: 99,
			cleared: 1,
			deleted: 0,
			failedBatches: 0,
		});
		const state = await snapshot(t);
		expect(
			state.posts.filter((post) => post.storageMissingSince === start)
		).toHaveLength(99);
		expect(state.objects).toEqual([]);
		expect(
			vi
				.mocked(storageRequest)
				.mock.calls.filter((call) => call[2] === "matured")
		).toHaveLength(1);
	});
});
