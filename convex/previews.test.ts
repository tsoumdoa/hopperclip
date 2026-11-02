import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import {
	PREVIEW_CAPS,
	PREVIEW_VERSION,
	type PreviewData,
} from "../src/types/preview";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const data: PreviewData = {
	count: 1,
	inputs: { sliders: 0, toggles: 0, lists: 0 },
	keyComponents: ["Move"],
	scripts: [],
	scriptCount: 0,
	plugins: [],
	pluginCount: 0,
	nodes: [0, 0, 1000, 500, 0],
	edges: [],
	groups: [],
};

async function setup() {
	const t = convexTest(schema, modules);
	const postId = await t.run((ctx) =>
		ctx.db.insert("post", {
			clerkUserId: "alice",
			name: "Snippet",
			bucketUrl: "old-file",
			dateCreated: new Date().toISOString(),
			dateUpdated: new Date().toISOString(),
		})
	);
	return {
		t,
		postId,
		owner: t.withIdentity({ id: "alice" }),
		args: { storageKey: "old-file", version: 1, data },
	};
}

test("previews require authentication and ownership of the storage key", async () => {
	const { t, owner, args } = await setup();
	await expect(t.mutation(api.previews.savePreview, args)).rejects.toThrow(
		"Not authenticated"
	);
	await expect(
		t.query(api.previews.getPreview, { storageKey: args.storageKey })
	).rejects.toThrow("Not authenticated");
	await expect(
		t.withIdentity({ id: "bob" }).mutation(api.previews.savePreview, args)
	).rejects.toThrow("Not authorized");
	await expect(
		owner.mutation(api.previews.savePreview, {
			...args,
			storageKey: "../invalid",
		})
	).rejects.toThrow();
	expect(
		await owner.query(api.previews.getPreview, { storageKey: args.storageKey })
	).toBeNull();
	await owner.mutation(api.previews.savePreview, args);
	expect(
		await t
			.withIdentity({ id: "bob" })
			.query(api.previews.getPreview, { storageKey: args.storageKey })
	).toBeNull();
	expect(
		await owner.query(api.previews.getPreview, { storageKey: args.storageKey })
	).toEqual({ version: 1, data });
});

test("current previews are no-ops and only the current version can be saved", async () => {
	const { t, owner, args } = await setup();
	await owner.mutation(api.previews.savePreview, args);
	const before = await t.run((ctx) => ctx.db.query("postPreviews").collect());
	await owner.mutation(api.previews.savePreview, {
		...args,
		data: { ...data, keyComponents: ["Changed"] },
	});
	for (const version of [-1, 0, 0.5, PREVIEW_VERSION + 1, 100])
		await expect(
			owner.mutation(api.previews.savePreview, { ...args, version })
		).rejects.toThrow("Invalid preview version");
	expect(await t.run((ctx) => ctx.db.query("postPreviews").collect())).toEqual(
		before
	);
});

test.each([0, PREVIEW_VERSION + 1])(
	"replaces an incompatible stored version %s",
	async (version) => {
		const { t, owner, args } = await setup();
		await t.run((ctx) =>
			ctx.db.insert("postPreviews", {
				clerkUserId: "alice",
				...args,
				version,
				data: { ...data, keyComponents: ["Old"] },
			})
		);
		await owner.mutation(api.previews.savePreview, args);
		expect(
			await owner.query(api.previews.getPreview, {
				storageKey: args.storageKey,
			})
		).toEqual({ version: PREVIEW_VERSION, data });
	}
);

test("malformed legacy keys return no preview instead of throwing", async () => {
	const { t, owner, postId } = await setup();
	for (const storageKey of ["../invalid", "https://old.example/file", ""]) {
		await t.run((ctx) => ctx.db.patch(postId, { bucketUrl: storageKey }));
		expect(
			await owner.query(api.previews.getPreview, { storageKey })
		).toBeNull();
	}
});

test.each(["public", "internal"])(
	"%s enforces array caps, string lengths, packed geometry and valid counts on the server",
	async (visibility) => {
		const { owner, args } = await setup();
		const invalid: PreviewData[] = [
			...(["keyComponents", "scripts", "plugins"] as const).flatMap((field) => [
				{ ...data, [field]: Array(PREVIEW_CAPS[field] + 1).fill("Name") },
				{ ...data, [field]: ["x".repeat(PREVIEW_CAPS.nameLength + 1)] },
			]),
			{ ...data, count: 401, nodes: Array(401).fill([0, 0, 1, 1, 0]).flat() },
			{ ...data, edges: Array(801).fill([0, 0]).flat() },
			{
				...data,
				groups: Array(31).fill({ x: 0, y: 0, w: 1, h: 1, color: "#ffffff" }),
			},
			{ ...data, nodes: [0] },
			{ ...data, nodes: [0, 0, 1, 1, 6] },
			{ ...data, edges: [0, 1] },
			{ ...data, edges: [0] },
			{ ...data, count: -1 },
			...(
				[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1] as const
			).flatMap((count) => [
				{ ...data, scriptCount: count },
				{ ...data, pluginCount: count },
			]),
			{ ...data, scriptCount: 2 },
			{ ...data, scripts: ["Python"], scriptCount: 0 },
			{ ...data, scripts: [], scriptCount: 1 },
			{ ...data, plugins: ["Kangaroo"], pluginCount: 0 },
			{ ...data, plugins: [], pluginCount: 1 },
			{ ...data, plugins: ["Kangaroo"], pluginCount: 4 },
			{ ...data, inputs: { sliders: 2, toggles: 0, lists: 0 } },
			{ ...data, groups: [{ x: 0, y: 0, w: 1, h: 1, color: "red" }] },
		];
		for (const data of invalid)
			await expect(
				visibility === "public"
					? owner.mutation(api.previews.savePreview, { ...args, data })
					: owner.mutation(internal.previewBackfill.savePreviewInternal, {
							...args,
							data,
							clerkUserId: "alice",
						})
			).rejects.toThrow();
		await expect(
			owner.mutation(api.previews.savePreview, { ...args, version: 0 })
		).rejects.toThrow("Invalid preview version");
	}
);

test("rename preserves previews; replacement and deletion clean up only the owner's digest", async () => {
	const { t, owner, args, postId } = await setup();
	await owner.mutation(api.previews.savePreview, args);
	await t.run(async (ctx) => {
		await ctx.db.insert("postPreviews", { clerkUserId: "bob", ...args });
		await ctx.db.insert("storageObjects", {
			clerkUserId: "alice",
			key: "new-file",
			state: "uploaded",
			expiresAt: Date.now() + 60000,
			attempts: 0,
		});
	});
	await owner.mutation(api.ghCard.updatePost, { id: postId, name: "Renamed" });
	expect(
		await owner.query(api.previews.getPreview, { storageKey: args.storageKey })
	).not.toBeNull();
	await owner.mutation(api.ghCard.updatePost, { id: postId, uid: "new-file" });
	expect(
		await owner.query(api.previews.getPreview, { storageKey: args.storageKey })
	).toBeNull();
	await owner.mutation(api.previews.savePreview, {
		...args,
		storageKey: "new-file",
	});
	await owner.mutation(api.ghCard.deletePost, { id: postId });
	expect(
		await owner.query(api.previews.getPreview, { storageKey: "new-file" })
	).toBeNull();
	const remaining = await t.run((ctx) =>
		ctx.db.query("postPreviews").collect()
	);
	expect(remaining).toHaveLength(1);
	expect(remaining[0].clerkUserId).toBe("bob");
});

test.each(["delete", "replace"])(
	"%s keeps a shared legacy preview until the last post reference is removed",
	async (action) => {
		const { t, owner, args, postId } = await setup();
		await owner.mutation(api.previews.savePreview, args);
		const sibling = await t.run(async (ctx) => {
			const post = (await ctx.db.get(postId))!;
			const id = await ctx.db.insert("post", {
				clerkUserId: post.clerkUserId,
				name: "Sibling",
				bucketUrl: post.bucketUrl,
				dateCreated: post.dateCreated,
				dateUpdated: post.dateUpdated,
			});
			await ctx.db.insert("storageObjects", {
				clerkUserId: "alice",
				key: "new-file",
				state: "uploaded",
				expiresAt: Date.now() + 60000,
				attempts: 0,
			});
			return id;
		});
		if (action === "delete")
			await owner.mutation(api.ghCard.deletePost, { id: postId });
		else
			await owner.mutation(api.ghCard.updatePost, {
				id: postId,
				uid: "new-file",
			});
		expect(
			await owner.query(api.previews.getPreview, {
				storageKey: args.storageKey,
			})
		).toEqual({ version: PREVIEW_VERSION, data });
		await owner.mutation(api.ghCard.deletePost, { id: sibling });
		expect(
			await owner.query(api.previews.getPreview, {
				storageKey: args.storageKey,
			})
		).toBeNull();
	}
);

test("stores full distinct script and plugin totals with capped name lists", async () => {
	const { owner, args } = await setup();
	const capped = {
		...data,
		count: 4,
		scripts: ["Python", "C#", "VB"],
		scriptCount: 4,
		plugins: ["LunchBoxML", "Kangaroo", "Human"],
		pluginCount: 5,
	};
	await owner.mutation(api.previews.savePreview, { ...args, data: capped });
	expect(
		await owner.query(api.previews.getPreview, { storageKey: args.storageKey })
	).toEqual({ version: PREVIEW_VERSION, data: capped });
});
