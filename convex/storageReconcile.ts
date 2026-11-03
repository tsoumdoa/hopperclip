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
import { isValidStorageOwner, storageRequest } from "./storageR2";
import { deletePostAndReferences } from "./postLifecycle";

// HEAD reconciliation only needs HTTP status. The default runtime is sufficient;
// unlike upload verification, it does not need Node's preserved gzip headers.
export const MISSING_GRACE_MS = 6 * 24 * 60 * 60 * 1000;
export const SCAN_BUDGET_MS = 8 * 60 * 1000;
const PAGE_SIZE = 100;
const HEAD_CONCURRENCY = 5;
const MISSING_REPORT_LIMIT = 200;
const modeValidator = v.union(v.literal("report"), v.literal("apply"));
const checkedPostValidator = v.object({
	postId: v.id("post"),
	bucketUrl: v.string(),
	clerkUserId: v.string(),
	status: v.union(v.literal("present"), v.literal("missing")),
	deleteVerified: v.optional(v.boolean()),
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
	// Missing scan entries explicitly authorized during a tripped run, before
	// re-verification. Duplicates and IDs absent from the missing set do not count.
	confirmed: number;
	reverifyUnknown: number;
	failedBatches: number;
	aborted?: "time_budget";
};

async function forEachConcurrent<T>(
	items: T[],
	visit: (item: T) => Promise<void>,
	shouldStop: () => boolean
) {
	let next = 0;
	await Promise.all(
		Array.from({ length: HEAD_CONCURRENCY }, async () => {
			while (next < items.length && !shouldStop()) {
				await visit(items[next++]);
			}
		})
	);
}

async function headStatus(clerkUserId: string, bucketUrl: string) {
	try {
		const response = await storageRequest("HEAD", clerkUserId, bucketUrl);
		if (response.ok) return "present";
		if (response.status === 404) return "missing";
	} catch {
		// Status/configuration/network failures are never evidence of absence.
	}
	return "unknown";
}

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
				!isValidStorageOwner(post.clerkUserId) ||
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
				console.warn("Storage reconciliation marked missing card", {
					postId: post._id,
					name: post.name,
					key: post.bucketUrl,
				});
			} else if (
				entry.deleteVerified === true &&
				post.storageMissingSince <= now - MISSING_GRACE_MS
			) {
				await deletePostAndReferences(ctx, post);
				counts.deleted++;
				console.warn("Storage reconciliation deleted missing card", {
					postId: post._id,
					name: post.name,
					key: post.bucketUrl,
				});
			}
		}
		return counts;
	},
});

export const run = internalAction({
	args: {
		mode: modeValidator,
		confirmPostIds: v.optional(v.array(v.id("post"))),
	},
	handler: async (ctx, { mode, confirmPostIds }): Promise<Summary> => {
		const startedAt = Date.now();
		const budgetExceeded = () => Date.now() - startedAt > SCAN_BUDGET_MS;
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
			confirmed: 0,
			reverifyUnknown: 0,
			failedBatches: 0,
		};
		// Retain only compact, definitive results until the full-scan breaker has
		// been evaluated. No page may write while later pages are still unchecked.
		const entries: (CheckedPost & { missingSince?: number })[] = [];
		let cursor: string | null = null;
		while (true) {
			if (budgetExceeded()) break;
			const result: PaginationResult<ScannedPost> = await ctx.runQuery(
				internal.storageReconcile.listPage,
				{
					cursor,
				}
			);
			await forEachConcurrent(
				result.page,
				async (post) => {
					if (
						!isValidStorageOwner(post.clerkUserId) ||
						!StorageKeySchema.safeParse(post.bucketUrl).success
					) {
						summary.unverifiable++;
						return;
					}
					const status = await headStatus(post.clerkUserId, post.bucketUrl);
					if (status === "unknown") {
						summary.unknown++;
						return;
					}
					summary[status]++;
					entries.push({
						postId: post.postId,
						bucketUrl: post.bucketUrl,
						clerkUserId: post.clerkUserId,
						status,
						missingSince: post.missingSince,
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
				},
				budgetExceeded
			);
			if (result.isDone) break;
			cursor = result.continueCursor;
		}
		summary.checked = summary.present + summary.missing;
		const attempted = summary.checked + summary.unknown;
		summary.breakerTripped =
			(summary.missing > 0 && summary.missing / summary.checked > 0.2) ||
			(attempted > 0 && (summary.missing + summary.unknown) / attempted > 0.2);
		const abort = () => {
			console.error(
				"Storage reconciliation exceeded scan time budget; no writes performed",
				{
					elapsedMs: Date.now() - startedAt,
					checked: summary.checked,
				}
			);
			summary.aborted = "time_budget";
			return summary;
		};
		if (budgetExceeded()) return abort();
		const refuseMissing = attempted > 0 && summary.present === 0;
		if (refuseMissing) {
			summary.breakerTripped = true;
			console.error(
				"Storage reconciliation refuses missing cards: no present object verifies the bucket",
				{
					checked: summary.checked,
					present: summary.present,
					missing: summary.missing,
					unknown: summary.unknown,
				}
			);
		} else if (summary.breakerTripped) {
			console.error(
				"Storage reconciliation breaker tripped; only present or explicitly confirmed cards may change",
				{
					checked: summary.checked,
					present: summary.present,
					missing: summary.missing,
					unknown: summary.unknown,
					unverifiable: summary.unverifiable,
				}
			);
		}
		if (mode === "report" || refuseMissing) return summary;
		const confirmedIds = new Set(confirmPostIds);
		let eligible = entries.filter((entry) => {
			if (entry.status === "present" || !summary.breakerTripped) return true;
			if (!confirmedIds.has(entry.postId)) return false;
			summary.confirmed++;
			return true;
		});
		const cutoff = Date.now() - MISSING_GRACE_MS;
		const candidates = eligible.filter(
			(entry) =>
				entry.status === "missing" &&
				entry.missingSince !== undefined &&
				entry.missingSince <= cutoff
		);
		const unverified = new Set<Id<"post">>();
		await forEachConcurrent(
			candidates,
			async (entry) => {
				const status = await headStatus(entry.clerkUserId, entry.bucketUrl);
				if (status === "unknown") {
					summary.reverifyUnknown++;
					unverified.add(entry.postId);
				} else {
					entry.status = status;
					// A mark that matures later during apply must wait for a future
					// verified run, rather than delete on its original scan result.
					entry.deleteVerified = status === "missing";
				}
			},
			budgetExceeded
		);
		if (budgetExceeded()) return abort();
		eligible = eligible.filter((entry) => !unverified.has(entry.postId));
		for (let i = 0; i < eligible.length; i += PAGE_SIZE) {
			try {
				const counts = await ctx.runMutation(
					internal.storageReconcile.applyBatch,
					{
						entries: eligible
							.slice(i, i + PAGE_SIZE)
							.map(({ missingSince: _missingSince, ...entry }) => entry),
					}
				);
				summary.marked += counts.marked;
				summary.cleared += counts.cleared;
				summary.deleted += counts.deleted;
			} catch (error) {
				summary.failedBatches++;
				console.error(
					"Storage reconciliation batch failed; continuing with later batches",
					{ batch: i / PAGE_SIZE, error }
				);
			}
		}
		return summary;
	},
});
