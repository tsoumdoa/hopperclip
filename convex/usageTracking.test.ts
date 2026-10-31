import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { addEvent, weights } from "./ranking";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const now = Date.parse("2026-10-01T00:00:00Z");
afterEach(() => vi.useRealTimers());

test("creation, editing and usage track heat with authorization and debounce", async () => {
	vi.useFakeTimers();
	vi.setSystemTime(now);
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		await ctx.db.insert("storageObjects", {
			clerkUserId: "alice",
			key: "test-file",
			state: "uploaded",
			expiresAt: now + 60000,
			attempts: 0,
		});
	});
	const owner = t.withIdentity({ id: "alice" });
	await owner.mutation(api.ghCard.addPost, {
		name: "Test",
		description: "",
		tags: [],
		uid: "test-file",
	});
	const post = (await t.run((ctx) => ctx.db.query("post").collect()))[0];
	expect(post.usageCount).toBe(0);
	expect(post.heat).toBe(addEvent(undefined, weights.created, now));
	expect(post.rankScore).toBe(post.heat);
	await expect(
		t.mutation(api.ghCard.recordUsage, { postId: post._id })
	).rejects.toThrow("Not authenticated");
	await expect(
		t
			.withIdentity({ id: "bob" })
			.mutation(api.ghCard.recordUsage, { postId: post._id })
	).rejects.toThrow("Not authorized");
	await owner.mutation(api.ghCard.updatePost, {
		id: post._id,
		name: "Updated",
	});
	let updated = await t.run((ctx) => ctx.db.get(post._id));
	expect(updated?.rankDirty).toBe(true);
	expect(updated?.rankScore).toBe(post.rankScore);
	expect(updated?.heat).toBe(addEvent(post.heat, weights.modified, now));
	await owner.mutation(api.ghCard.recordUsage, { postId: post._id });
	await owner.mutation(api.ghCard.recordUsage, { postId: post._id });
	updated = await t.run((ctx) => ctx.db.get(post._id));
	expect(updated?.usageCount).toBe(1);
	expect(updated?.lastUsedAt).toBe(now);
	expect(updated?.heat).toBe(
		addEvent(addEvent(post.heat, weights.modified, now), weights.copy, now)
	);
	vi.setSystemTime(now + 60000);
	await owner.mutation(api.ghCard.recordUsage, { postId: post._id });
	updated = await t.run((ctx) => ctx.db.get(post._id));
	expect(updated?.usageCount).toBe(2);
	expect(updated?.lastUsedAt).toBe(now + 60000);
});

test("backfill traverses pages and is idempotent", async () => {
	vi.useFakeTimers();
	vi.setSystemTime(now);
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		for (let i = 0; i < 105; i++)
			await ctx.db.insert("post", {
				name: `Post ${i}`,
				bucketUrl: `key-${i}`,
				dateCreated: new Date(now).toISOString(),
				dateUpdated: new Date(now + (i % 2 ? 2000 : 500)).toISOString(),
			});
	});
	const run = async () => {
		await t.mutation(internal.rankingBackfill.backfill, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
	};
	await run();
	const first = await t.run((ctx) => ctx.db.query("post").collect());
	expect(first).toHaveLength(105);
	for (const post of first) {
		let heat = addEvent(undefined, weights.created, now);
		if (Date.parse(post.dateUpdated) - now > 1000)
			heat = addEvent(heat, weights.modified, now + 2000);
		expect(post.heat).toBe(heat);
		expect(post.rankScore).toBe(heat);
		expect(post.usageCount).toBe(0);
	}
	await run();
	expect(await t.run((ctx) => ctx.db.query("post").collect())).toEqual(first);
});

test("legacy edits and copies retain historical heat through backfill", async () => {
	vi.useFakeTimers();
	vi.setSystemTime(now);
	const t = convexTest(schema, modules);
	const created = now - 100000;
	const modified = now - 50000;
	const ids = await t.run(async (ctx) => {
		const make = (name: string) =>
			ctx.db.insert("post", {
				name,
				clerkUserId: "alice",
				bucketUrl: name,
				dateCreated: new Date(created).toISOString(),
				dateUpdated: new Date(modified).toISOString(),
			});
		return [await make("edited"), await make("copied")];
	});
	const owner = t.withIdentity({ id: "alice" });
	await owner.mutation(api.ghCard.updatePost, { id: ids[0], name: "Updated" });
	await owner.mutation(api.ghCard.recordUsage, { postId: ids[1] });
	const base = addEvent(
		addEvent(undefined, weights.created, created),
		weights.modified,
		modified
	);
	const before = await Promise.all(
		ids.map((id) => t.run((ctx) => ctx.db.get(id)))
	);
	expect(before[0]?.heat).toBe(addEvent(base, weights.modified, now));
	expect(before[1]?.heat).toBe(addEvent(base, weights.copy, now));
	expect(before[0]?.usageCount).toBeUndefined();
	expect(before[1]?.usageCount).toBe(1);
	const run = async () => {
		await t.mutation(internal.rankingBackfill.backfill, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
	};
	await run();
	const after = await Promise.all(
		ids.map((id) => t.run((ctx) => ctx.db.get(id)))
	);
	expect(after[0]?.rankScore).toBe(before[0]?.heat);
	expect(after[0]?.usageCount).toBe(0);
	expect(after[1]?.rankScore).toBe(before[1]?.heat);
	expect(after[1]?.usageCount).toBe(1);
	await run();
	expect(
		await Promise.all(ids.map((id) => t.run((ctx) => ctx.db.get(id))))
	).toEqual(after);
});
