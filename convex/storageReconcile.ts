import { v, type Infer } from "convex/values";
import type { PaginationResult } from "convex/server";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { StorageKeySchema } from "../src/types/types";
import { storageRequest } from "./storageR2";
import { deletePostAndReferences } from "./postLifecycle";

// HEAD reconciliation only needs HTTP status. The default runtime is sufficient;
// unlike upload verification, it does not need Node's preserved gzip headers.
export const MISSING_GRACE_MS = 6 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const HEAD_CONCURRENCY = 5;
const MISSING_REPORT_LIMIT = 200;
const modeValidator = v.union(v.literal("report"), v.literal("apply"));
const checkedPostValidator = v.object({
	postId: v.id("post"),
	bucketUrl: v.string(),
	clerkUserId: v.string(),
	status: v.union(v.literal("present"), v.literal("missing")),
});
type CheckedPost = Infer<typeof checkedPostValidator>;
type ScannedPost = {
	postId: Id<"post">;
	name: string;
	bucketUrl: string;
	clerkUserId?: string;
	missingSince?: number;
};
type Summary = {
	mode: Infer<typeof modeValidator>;
	checked: number;
	present: number;
	missing: number;
	unknown: number;
	unverifiable: number;
	breakerTripped: boolean;
	missingPosts: { postId: Id<"post">; name: string; missingSince?: number }[];
	marked: number;
	cleared: number;
	deleted: number;
};

export const listPage = internalQuery({
	args: { cursor: v.union(v.string(), v.null()) },
	handler: async (ctx, { cursor }) => {
		const result = await ctx.db.query("post").paginate({
			cursor,
			numItems: PAGE_SIZE,
		});
		return {
			...result,
			page: result.page.map((post) => ({
				postId: post._id,
				name: post.name,
				bucketUrl: post.bucketUrl,
				clerkUserId: post.clerkUserId,
				missingSince: post.storageMissingSince,
			})),
		};
	},
});

export const applyBatch = internalMutation({
	args: { entries: v.array(checkedPostValidator) },
	handler: async (ctx, { entries }) => {
		if (entries.length > PAGE_SIZE)
			throw new Error("Reconcile batch exceeds 100");
		const now = Date.now();
		const counts = { marked: 0, cleared: 0, deleted: 0 };
		for (const entry of entries) {
			const post = await ctx.db.get(entry.postId);
			// Revalidate the whole object identity in this transaction: an upload
			// replacement (or administrative owner change) invalidates the HEAD.
			if (
				!post ||
				post.bucketUrl !== entry.bucketUrl ||
				post.clerkUserId !== entry.clerkUserId ||
				!post.clerkUserId ||
				!StorageKeySchema.safeParse(post.bucketUrl).success
			)
				continue;
			if (entry.status === "present") {
				if (post.storageMissingSince !== undefined) {
					await ctx.db.patch(post._id, { storageMissingSince: undefined });
					counts.cleared++;
				}
			} else if (post.storageMissingSince === undefined) {
				await ctx.db.patch(post._id, { storageMissingSince: now });
				counts.marked++;
			} else if (post.storageMissingSince <= now - MISSING_GRACE_MS) {
				await deletePostAndReferences(ctx, post);
				counts.deleted++;
			}
		}
		return counts;
	},
});

export const run = internalAction({
	args: {
		mode: modeValidator,
		overrideBreaker: v.optional(v.boolean()),
	},
	handler: async (ctx, { mode, overrideBreaker }): Promise<Summary> => {
		const summary: Summary = {
			mode,
			checked: 0,
			present: 0,
			missing: 0,
			unknown: 0,
			unverifiable: 0,
			breakerTripped: false,
			missingPosts: [],
			marked: 0,
			cleared: 0,
			deleted: 0,
		};
		// Retain only compact, definitive results until the full-scan breaker has
		// been evaluated. No page may write while later pages are still unchecked.
		const entries: CheckedPost[] = [];
		let cursor: string | null = null;
		while (true) {
			const result: PaginationResult<ScannedPost> = await ctx.runQuery(
				internal.storageReconcile.listPage,
				{
					cursor,
				}
			);
			let next = 0;
			await Promise.all(
				Array.from({ length: HEAD_CONCURRENCY }, async () => {
					while (next < result.page.length) {
						const post = result.page[next++];
						if (
							!post.clerkUserId ||
							!StorageKeySchema.safeParse(post.bucketUrl).success
						) {
							summary.unverifiable++;
							continue;
						}
						let status: CheckedPost["status"];
						try {
							const response = await storageRequest(
								"HEAD",
								post.clerkUserId,
								post.bucketUrl
							);
							if (response.ok) status = "present";
							else if (response.status === 404) status = "missing";
							else {
								summary.unknown++;
								continue;
							}
						} catch {
							summary.unknown++;
							continue;
						}
						summary[status]++;
						entries.push({
							postId: post.postId,
							bucketUrl: post.bucketUrl,
							clerkUserId: post.clerkUserId,
							status,
						});
						if (
							status === "missing" &&
							summary.missingPosts.length < MISSING_REPORT_LIMIT
						) {
							summary.missingPosts.push({
								postId: post.postId,
								name: post.name,
								...(post.missingSince !== undefined && {
									missingSince: post.missingSince,
								}),
							});
						}
					}
				})
			);
			if (result.isDone) break;
			cursor = result.continueCursor;
		}
		summary.checked = summary.present + summary.missing;
		summary.breakerTripped =
			summary.checked === 0 ||
			(summary.missing > 0 && summary.missing / summary.checked > 0.2) ||
			summary.unknown / (summary.checked + summary.unknown) > 0.2;
		if (summary.breakerTripped && overrideBreaker !== true) {
			console.error(
				"Storage reconciliation breaker tripped; no writes performed",
				{
					checked: summary.checked,
					present: summary.present,
					missing: summary.missing,
					unknown: summary.unknown,
					unverifiable: summary.unverifiable,
				}
			);
			return summary;
		}
		if (mode === "apply") {
			for (let i = 0; i < entries.length; i += PAGE_SIZE) {
				const counts = await ctx.runMutation(
					internal.storageReconcile.applyBatch,
					{
						entries: entries.slice(i, i + PAGE_SIZE),
					}
				);
				summary.marked += counts.marked;
				summary.cleared += counts.cleared;
				summary.deleted += counts.deleted;
			}
		}
		return summary;
	},
});
