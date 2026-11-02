import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { Workpool } from "@convex-dev/workpool";
import { register } from "@convex-dev/workpool/test";
import { internal } from "./_generated/api";
import schema from "./schema";
import { PREVIEW_VERSION, type PreviewData } from "../src/types/preview";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const data: PreviewData = {
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
const dates = {
	name: "Snippet",
	dateCreated: "2026-11-01",
	dateUpdated: "2026-11-01",
};

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

test("driver enqueue filters versions, malformed keys and owners and deduplicates each page", async () => {
	const t = convexTest(schema, modules);
	register(t, "previewBackfillPool");
	await t.run(async (ctx) => {
		for (const [clerkUserId, bucketUrl] of [
			["alice", "current"],
			["alice", "outdated"],
			["alice", "missing"],
			["alice", "missing"],
			["bob", "current"],
			[undefined, "unowned"],
			["", "empty-owner"],
			["alice", "../bad"],
			["alice", "https://old.example/file"],
			["alice", ""],
		])
			await ctx.db.insert("post", {
				clerkUserId,
				bucketUrl: bucketUrl!,
				...dates,
			});
		for (const [storageKey, version] of [
			["current", PREVIEW_VERSION],
			["outdated", 0],
		] as const)
			await ctx.db.insert("postPreviews", {
				clerkUserId: "alice",
				storageKey,
				version,
				data,
			});
	});
	vi.useFakeTimers();
	const enqueue = vi.spyOn(Workpool.prototype, "enqueueAction");
	await t.mutation(internal.previewBackfill.start, {});
	expect(enqueue.mock.calls.map((call) => call[2])).toEqual([
		{ clerkUserId: "alice", storageKey: "outdated" },
		{ clerkUserId: "alice", storageKey: "missing" },
		{ clerkUserId: "bob", storageKey: "current" },
	]);
	expect(enqueue).toHaveBeenCalledTimes(3);
});

test("driver schedules through a fully filtered page and paginates to completion", async () => {
	vi.useFakeTimers();
	const t = convexTest(schema, modules);
	register(t, "previewBackfillPool");
	const enqueue = vi
		.spyOn(Workpool.prototype, "enqueueAction")
		.mockResolvedValue(
			"test-work" as Awaited<ReturnType<Workpool["enqueueAction"]>>
		);
	await t.run(async (ctx) => {
		for (let i = 0; i < 224; i++)
			await ctx.db.insert("post", {
				clerkUserId: "alice",
				bucketUrl: i < 100 ? "../bad" : `key-${i}`,
				...dates,
			});
	});
	await t.mutation(internal.previewBackfill.start, {});
	expect(enqueue).not.toHaveBeenCalled();
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(enqueue.mock.calls.map((call) => call[2])).toEqual(
		Array.from({ length: 124 }, (_, i) => ({
			clerkUserId: "alice",
			storageKey: `key-${i + 100}`,
		}))
	);
	const scheduled = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect()
	);
	expect(scheduled.every((row) => row.state.kind === "success")).toBe(true);
});
test("internal saves enforce ownership and version, upsert, and remain idempotent", async () => {
	const t = convexTest(schema, modules);
	register(t, "previewBackfillPool");
	const args = {
		clerkUserId: "alice",
		storageKey: "file",
		version: PREVIEW_VERSION,
		data,
	};
	const id = await t.run((ctx) =>
		ctx.db.insert("post", { clerkUserId: "alice", bucketUrl: "file", ...dates })
	);
	await expect(
		t.mutation(internal.previewBackfill.savePreviewInternal, {
			...args,
			clerkUserId: "bob",
		})
	).resolves.toBeNull();
	await expect(
		t.mutation(internal.previewBackfill.savePreviewInternal, {
			...args,
			storageKey: "../bad",
		})
	).rejects.toThrow();
	for (const version of [-1, 0, 0.5, PREVIEW_VERSION + 1])
		await expect(
			t.mutation(internal.previewBackfill.savePreviewInternal, {
				...args,
				version,
			})
		).rejects.toThrow("Invalid preview version");
	expect(
		await t.mutation(internal.previewBackfill.savePreviewInternal, args)
	).toBe(true);
	const before = await t.run((ctx) => ctx.db.query("postPreviews").collect());
	expect(
		await t.mutation(internal.previewBackfill.savePreviewInternal, {
			...args,
			data: { ...data, keyComponents: ["Changed"] },
		})
	).toBe(false);
	expect(await t.run((ctx) => ctx.db.query("postPreviews").collect())).toEqual(
		before
	);
	expect(
		await t.query(internal.previewBackfill.getState, {
			clerkUserId: "alice",
			storageKey: "file",
		})
	).toBe("current");
	await t.run((ctx) => ctx.db.patch(before[0]._id, { version: 0 }));
	expect(
		await t.mutation(internal.previewBackfill.savePreviewInternal, args)
	).toBe(true);
	expect(await t.run((ctx) => ctx.db.query("postPreviews").collect())).toEqual(
		before
	);
	// A post replaced or deleted during download must not receive a stale digest.
	await t.run((ctx) => ctx.db.patch(id, { bucketUrl: "replacement" }));
	await expect(
		t.mutation(internal.previewBackfill.savePreviewInternal, args)
	).resolves.toBeNull();
	await t.run((ctx) => ctx.db.delete(id));
	await expect(
		t.mutation(internal.previewBackfill.savePreviewInternal, args)
	).resolves.toBeNull();
});
