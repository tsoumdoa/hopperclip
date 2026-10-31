import type { PaginationResult } from "convex/server";
import type { Doc } from "./_generated/dataModel";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { SORT_ORDERS } from "../src/types/types";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
afterEach(() => vi.useRealTimers());

test("pagination preserves every sort and filters across pages within the owner", async () => {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		for (let i = 0; i < 31; i++)
			await ctx.db.insert("post", {
				name: `post ${30 - i}`,
				bucketUrl: `key-${i}`,
				dateCreated: new Date(100000 + i * 1000).toISOString(),
				dateUpdated: new Date(100000 + (i % 9) * 1000).toISOString(),
				clerkUserId: i === 30 ? "bob" : "alice",
				tags: i % 3 === 0 ? ["match"] : [],
			});
	});
	const owner = t.withIdentity({ id: "alice" });
	for (const sortOrder of [
		...SORT_ORDERS.map((s) => s.value),
		"ascLastEdited",
	]) {
		for (const tags of [[], ["match"]]) {
			const expected = await owner.query(api.ghCard.getAll, {
				sortOrder,
				tags,
			});
			let cursor: string | null = null;
			const ids: string[] = [];
			let done = false;
			for (let i = 0; !done && i < 50; i++) {
				const page: PaginationResult<Doc<"post">> = await owner.query(
					api.ghCard.listPage,
					{
						sortOrder,
						tags,
						paginationOpts: { numItems: 7, cursor },
					}
				);
				ids.push(...page.page.map((p) => p._id));
				cursor = page.continueCursor;
				done = page.isDone;
			}
			expect(done).toBe(true);
			expect(ids).toEqual(expected.map((p) => p._id));
			expect(new Set(ids).size).toBe(tags.length ? 10 : 30);
		}
	}
	await expect(
		t.query(api.ghCard.listPage, {
			paginationOpts: { numItems: 7, cursor: null },
		})
	).rejects.toThrow("Not authenticated");
});

test("share expiry follows creation, revocation and backfill", async () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
	const t = convexTest(schema, modules);
	const id = await t.run((ctx) =>
		ctx.db.insert("post", {
			name: "Post",
			bucketUrl: "key",
			dateCreated: new Date().toISOString(),
			dateUpdated: new Date().toISOString(),
			clerkUserId: "alice",
		})
	);
	const owner = t.withIdentity({ id: "alice" });
	const share = await owner.mutation(api.ghCard.createShare, { postId: id });
	expect((await t.run((ctx) => ctx.db.get(id)))?.activeShareExpiresAt).toBe(
		share.expiryDate
	);
	await t.run((ctx) => ctx.db.patch(id, { activeShareExpiresAt: undefined }));
	await owner.mutation(api.ghCard.createShare, { postId: id });
	expect((await t.run((ctx) => ctx.db.get(id)))?.activeShareExpiresAt).toBe(
		share.expiryDate
	);
	await owner.mutation(api.ghCard.revokeShare, {
		shareToken: share.shareToken,
	});
	expect(
		(await t.run((ctx) => ctx.db.get(id)))?.activeShareExpiresAt
	).toBeUndefined();
	await t.run((ctx) =>
		ctx.db.insert("shares", {
			postId: id,
			shareToken: "legacy",
			expiryDate: "2026-11-01T00:00:00.000Z",
			createdAt: new Date().toISOString(),
			clerkUserId: "alice",
		})
	);
	const run = async () => {
		await t.mutation(internal.rankingBackfill.sharesBackfill, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
	};
	await run();
	const first = await t.run((ctx) => ctx.db.get(id));
	expect(first?.activeShareExpiresAt).toBe("2026-11-01T00:00:00.000Z");
	await run();
	expect(await t.run((ctx) => ctx.db.get(id))).toEqual(first);
});

test("ranking sorts settle usage and process multiple batches", async () => {
	vi.useFakeTimers();
	const t = convexTest(schema, modules);
	const ids = await t.run(async (ctx) => {
		const ids = [];
		for (let i = 0; i < 205; i++)
			ids.push(
				await ctx.db.insert("post", {
					name: `Post ${i}`,
					bucketUrl: `key-${i}`,
					dateCreated: new Date().toISOString(),
					dateUpdated: new Date().toISOString(),
					clerkUserId: "alice",
					heat: i / 1000,
					rankScore: i / 1000,
					usageCount: 205 - i,
					rankDirty: true,
				})
			);
		return ids;
	});
	const owner = t.withIdentity({ id: "alice" });
	for (const sortOrder of [undefined, "recommended", "mostUsed"]) {
		const args = sortOrder ? { sortOrder } : {};
		const all = await owner.query(api.ghCard.getAll, args);
		const page = await owner.query(api.ghCard.listPage, {
			...args,
			paginationOpts: { numItems: 210, cursor: null },
		});
		expect(all[0]._id).toBe(sortOrder === "mostUsed" ? ids[0] : ids[204]);
		expect(page.page.map((p) => p._id)).toEqual(all.map((p) => p._id));
	}
	const readOrder = async () => {
		const all = await owner.query(api.ghCard.getAll, {
			sortOrder: "recommended",
		});
		const page = await owner.query(api.ghCard.listPage, {
			sortOrder: "recommended",
			paginationOpts: { numItems: 210, cursor: null },
		});
		return [all.map((p) => p._id), page.page.map((p) => p._id)];
	};
	const before = await readOrder();
	expect(before).toEqual([ids.slice().reverse(), ids.slice().reverse()]);
	await owner.mutation(api.ghCard.recordUsage, { postId: ids[0] });
	expect(await readOrder()).toEqual(before);
	await t.mutation(internal.rankingBackfill.settleRankScores, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(await readOrder()).toEqual([
		[ids[0], ...ids.slice(1).reverse()],
		[ids[0], ...ids.slice(1).reverse()],
	]);
	const posts = await t.run((ctx) => ctx.db.query("post").collect());
	expect(
		posts.every((p) => p.rankDirty === undefined && p.rankScore === p.heat)
	).toBe(true);
	await t.mutation(internal.rankingBackfill.settleRankScores, {});
	expect(await t.run((ctx) => ctx.db.query("post").collect())).toEqual(posts);
	expect(vi.getTimerCount()).toBe(0);
});

test("settle interleaves legacy and initialized cards", async () => {
	vi.useFakeTimers();
	const t = convexTest(schema, modules);
	const ids = await t.run(async (ctx) => {
		const create = async (name: string, time: number, score?: number) =>
			ctx.db.insert("post", {
				name,
				bucketUrl: name,
				clerkUserId: "alice",
				dateCreated: new Date(time).toISOString(),
				dateUpdated: new Date(time).toISOString(),
				...(score === undefined
					? {}
					: { heat: score, rankScore: score, usageCount: 0 }),
			});
		const now = Date.now();
		const { addEvent, weights } = await import("./ranking");
		return [
			await create("old", now - 100000),
			await create(
				"new",
				now,
				addEvent(undefined, weights.created, now - 50000)
			),
			await create("recent", now),
		];
	});
	const owner = t.withIdentity({ id: "alice" });
	const order = async () =>
		(await owner.query(api.ghCard.getAll, {})).map((p) => p._id);
	expect((await order())[0]).toBe(ids[1]);
	await t.mutation(internal.rankingBackfill.settleRankScores, {});
	expect(await order()).toEqual([ids[2], ids[1], ids[0]]);
	expect((await t.run((ctx) => ctx.db.get(ids[0])))?.usageCount).toBe(0);
	expect((await t.run((ctx) => ctx.db.get(ids[2])))?.usageCount).toBe(0);
});
