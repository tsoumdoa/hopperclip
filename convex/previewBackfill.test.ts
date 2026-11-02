import { convexTest } from "convex-test";
import { expect, test } from "vitest";
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

test("missing query filters versions, malformed keys and owners and deduplicates each page", async () => {
	const t = convexTest(schema, modules);
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
	const page = await t.query(internal.previewBackfill.listMissing, {});
	expect(page.entries).toEqual([
		{ clerkUserId: "alice", bucketUrl: "outdated" },
		{ clerkUserId: "alice", bucketUrl: "missing" },
		{ clerkUserId: "bob", bucketUrl: "current" },
	]);
	expect(page.isDone).toBe(true);
});

test("pagination advances even through a fully filtered page and can resume from a cursor", async () => {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		for (let i = 0; i < 24; i++)
			await ctx.db.insert("post", {
				clerkUserId: "alice",
				bucketUrl: i < 10 ? "../bad" : `key-${i}`,
				...dates,
			});
	});
	const first = await t.query(internal.previewBackfill.listMissing, {});
	expect(first.entries).toEqual([]);
	expect(first.isDone).toBe(false);
	const second = await t.query(internal.previewBackfill.listMissing, {
		cursor: first.continueCursor,
	});
	expect(second.entries).toHaveLength(10);
	expect(second.isDone).toBe(false);
	expect(
		await t.query(internal.previewBackfill.listMissing, {
			cursor: first.continueCursor,
		})
	).toEqual(second);
	const last = await t.query(internal.previewBackfill.listMissing, {
		cursor: second.continueCursor,
	});
	expect(last.isDone).toBe(true);
	expect([...second.entries, ...last.entries].map((p) => p.bucketUrl)).toEqual(
		Array.from({ length: 14 }, (_, i) => `key-${i + 10}`)
	);
});

test("internal saves enforce ownership and version, upsert, and remain idempotent", async () => {
	const t = convexTest(schema, modules);
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
	).rejects.toThrow("Not authorized");
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
		(await t.query(internal.previewBackfill.listMissing, {})).entries
	).toEqual([]);
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
	).rejects.toThrow("Not authorized");
	await t.run((ctx) => ctx.db.delete(id));
	await expect(
		t.mutation(internal.previewBackfill.savePreviewInternal, args)
	).rejects.toThrow("Not authorized");
});
