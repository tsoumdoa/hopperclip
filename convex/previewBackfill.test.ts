import { convexTest, type TestConvex } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { register } from "@convex-dev/workpool/test";
import { internal } from "./_generated/api";
import schema from "./schema";
import { PREVIEW_VERSION, type PreviewData } from "../src/types/preview";
import { MAX_BACKFILL_XML_TAGS } from "./previewBackfillNode";

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
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

function poolSetup() {
	vi.useFakeTimers();
	vi.stubEnv("R2_URL", "https://example.test/bucket");
	vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
	vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
	const t = convexTest(schema, modules);
	register(t, "previewBackfillPool");
	const fetch = vi.fn<typeof globalThis.fetch>();
	vi.stubGlobal("fetch", fetch);
	const logs = vi.spyOn(console, "log").mockImplementation(() => {});
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const terminalFailures = () =>
		errors.mock.calls.filter(
			([message]) => message === "Preview backfill terminal failure"
		);
	return { t, fetch, logs, terminalFailures };
}

async function addPost(t: TestConvex<typeof schema>, bucketUrl = "file") {
	await t.run((ctx) =>
		ctx.db.insert("post", {
			clerkUserId: "alice",
			bucketUrl,
			...dates,
		})
	);
}

test.each([503, 404])(
	"real Workpool bounds HTTP %i attempts and never re-enqueues terminal work",
	async (status) => {
		const { t, fetch, terminalFailures } = poolSetup();
		await addPost(t);
		fetch.mockImplementation(async () => new Response(null, { status }));
		await t.mutation(internal.previewBackfill.start, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(fetch).toHaveBeenCalledTimes(status === 503 ? 3 : 1);
		expect(terminalFailures()).toHaveLength(status === 503 ? 1 : 0);
		await t.mutation(internal.previewBackfill.start, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(fetch).toHaveBeenCalledTimes(status === 503 ? 3 : 1);
		expect(terminalFailures()).toHaveLength(status === 503 ? 1 : 0);
	}
);

test("real Workpool deduplicates overlapping starts, pages and completed passes while filtering current previews and invalid posts", async () => {
	const { t, fetch, terminalFailures } = poolSetup();
	const xml = readFileSync("parser/sand/xmls/three-grouped.xml", "utf8");
	fetch.mockImplementation(async () => new Response(xml));
	await t.run(async (ctx) => {
		// A fully filtered first page must still schedule the rest of the pass.
		for (let i = 0; i < 100; i++)
			await ctx.db.insert("post", {
				clerkUserId: "alice",
				bucketUrl: "../bad",
				...dates,
			});
		for (const [clerkUserId, bucketUrl] of [
			["alice", "current"],
			["alice", "outdated"],
			["bob", "current"],
			[undefined, "unowned"],
			["", "empty-owner"],
			["alice", "https://old.example/file"],
			["alice", ""],
		])
			await ctx.db.insert("post", {
				clerkUserId,
				bucketUrl: bucketUrl!,
				...dates,
			});
		// Duplicate files span pages and owners remain independent.
		for (let i = 0; i < 110; i++)
			await ctx.db.insert("post", {
				clerkUserId: "alice",
				bucketUrl: "missing",
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
		// An older version's permanent claim allows a fresh pass.
		await ctx.db.insert("previewBackfillClaims", {
			clerkUserId: "alice",
			storageKey: "outdated",
			version: PREVIEW_VERSION - 1,
		});
	});
	await t.mutation(internal.previewBackfill.start, {});
	await t.mutation(internal.previewBackfill.start, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(
		fetch.mock.calls
			.map(([request]) => new URL((request as Request).url).pathname)
			.sort()
	).toEqual([
		"/bucket/alice/missing",
		"/bucket/alice/outdated",
		"/bucket/bob/current",
	]);
	expect(
		await t.run((ctx) => ctx.db.query("postPreviews").collect())
	).toHaveLength(4);
	expect(
		await t.run((ctx) => ctx.db.query("previewBackfillClaims").collect())
	).toHaveLength(4);
	await t.mutation(internal.previewBackfill.start, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(fetch).toHaveBeenCalledTimes(3);
	expect(terminalFailures()).toHaveLength(0);
});

test("real Workpool cancellation prevents pending fetches and retains claims", async () => {
	const { t, fetch, terminalFailures } = poolSetup();
	await addPost(t);
	await t.mutation(internal.previewBackfill.start, {});
	// convex-test assigns fractional creation times; advance the cancelAll cutoff
	// past the enqueue without running any scheduled work.
	vi.setSystemTime(Date.now() + 1);
	await t.mutation(internal.previewBackfill.cancel, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	await t.mutation(internal.previewBackfill.start, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(fetch).not.toHaveBeenCalled();
	expect(terminalFailures()).toHaveLength(0);
	expect(
		await t.run((ctx) => ctx.db.query("previewBackfillClaims").collect())
	).toHaveLength(1);
});

test("real Workpool cancellation also stops later pages of a running pass", async () => {
	const { t, fetch } = poolSetup();
	// A full first page of malformed keys is skipped, so the only valid post
	// sits on the scheduled second page.
	await t.run(async (ctx) => {
		for (let i = 0; i < 100; i++)
			await ctx.db.insert("post", {
				clerkUserId: "alice",
				bucketUrl: `bad key ${i}`,
				...dates,
			});
	});
	await addPost(t);
	await t.mutation(internal.previewBackfill.start, {});
	await t.mutation(internal.previewBackfill.cancel, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(fetch).not.toHaveBeenCalled();
	expect(
		await t.run((ctx) => ctx.db.query("previewBackfillClaims").collect())
	).toHaveLength(0);
});

test.each(["too-complex", "invalid-gzip"])(
	"real Workpool treats %s as a one-attempt permanent skip",
	async (failure) => {
		const { t, fetch, logs, terminalFailures } = poolSetup();
		await addPost(t);
		fetch.mockImplementation(async () =>
			failure === "too-complex"
				? new Response(`<root>${"<b/>".repeat(MAX_BACKFILL_XML_TAGS)}</root>`)
				: new Response(
						new ReadableStream({
							start(controller) {
								controller.error(
									new TypeError("terminated", {
										cause: Object.assign(new Error("corrupt gzip"), {
											code: "Z_DATA_ERROR",
										}),
									})
								);
							},
						}),
						{ headers: { "content-encoding": "gzip" } }
					)
		);
		await t.mutation(internal.previewBackfill.start, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(fetch).toHaveBeenCalledOnce();
		expect(logs).toHaveBeenCalledWith(
			"Preview backfill",
			"alice",
			"file",
			`skipped:${failure}`
		);
		expect(terminalFailures()).toHaveLength(0);
		await t.mutation(internal.previewBackfill.start, {});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(fetch).toHaveBeenCalledOnce();
	}
);

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
