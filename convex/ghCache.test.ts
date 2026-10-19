import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

test("file resolution is owner-only and observes committed replacements and deletion", async () => {
	const t = convexTest(schema, modules);
	const postId = await t.run(async (ctx) => {
		await ctx.db.insert("storageObjects", {
			clerkUserId: "alice",
			key: "new-file",
			state: "uploaded",
			expiresAt: Date.now() + 60_000,
			attempts: 0,
		});
		return ctx.db.insert("post", {
			clerkUserId: "alice",
			name: "Snippet",
			description: "",
			tags: [],
			bucketUrl: "old-file",
			dateCreated: new Date().toISOString(),
			dateUpdated: new Date().toISOString(),
		});
	});
	const owner = t.withIdentity({ id: "alice" });
	await expect(t.query(api.ghCard.getOwnedFile, { postId })).rejects.toThrow(
		"Not authenticated"
	);
	expect(
		await t
			.withIdentity({ id: "bob" })
			.query(api.ghCard.getOwnedFile, { postId })
	).toBeNull();
	expect(await owner.query(api.ghCard.getOwnedFile, { postId })).toEqual({
		userId: "alice",
		bucketKey: "old-file",
	});
	await owner.mutation(api.ghCard.updatePost, {
		id: postId,
		name: "Renamed",
		description: "",
		tags: [],
	});
	expect(
		(await owner.query(api.ghCard.getOwnedFile, { postId }))?.bucketKey
	).toBe("old-file");
	await owner.mutation(api.ghCard.updatePost, {
		id: postId,
		uid: "new-file",
		name: "Renamed",
		description: "",
		tags: [],
	});
	expect(
		(await owner.query(api.ghCard.getOwnedFile, { postId }))?.bucketKey
	).toBe("new-file");
	await owner.mutation(api.ghCard.deletePost, { id: postId });
	expect(await owner.query(api.ghCard.getOwnedFile, { postId })).toBeNull();
});
