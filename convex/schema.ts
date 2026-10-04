import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	post: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		dateCreated: v.string(),
		dateUpdated: v.string(),
		bucketUrl: v.string(),
		clerkUserId: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
	})
		.index("by_clerkUserId", ["clerkUserId"])
		.index("by_user_storageKey", ["clerkUserId", "bucketUrl"])
		.index("by_user_dateUpdated", ["clerkUserId", "dateUpdated"])
		.index("by_user_dateCreated", ["clerkUserId", "dateCreated"])
		.index("by_user_name", ["clerkUserId", "name"]),

	shares: defineTable({
		postId: v.id("post"),
		shareToken: v.string(),
		expiryDate: v.string(),
		createdAt: v.string(),
		clerkUserId: v.string(),
	})
		.index("by_shareToken", ["shareToken"])
		.index("by_postId", ["postId"])
		.index("by_expiryDate", ["expiryDate"]),

	// This is both the upload ledger and the durable deletion outbox. Deleted
	// rows remain as tombstones: a key must never be attached or uploaded again.
	storageObjects: defineTable({
		clerkUserId: v.string(),
		key: v.string(),
		state: v.union(
			v.literal("reserved"),
			v.literal("uploaded"),
			v.literal("attached"),
			v.literal("deleting"),
			v.literal("deleted")
		),
		expiresAt: v.optional(v.number()),
		nextAttemptAt: v.optional(v.number()),
		attempts: v.number(),
		deletedAt: v.optional(v.number()),
		lastFailureAt: v.optional(v.number()),
	})
		.index("by_user_key", ["clerkUserId", "key"])
		.index("by_state_expiry", ["state", "expiresAt"])
		.index("by_state_nextAttempt", ["state", "nextAttemptAt"]),

	shareAccessLimits: defineTable({
		key: v.string(),
		tokens: v.number(),
		updatedAt: v.number(),
		expiresAt: v.number(),
	})
		.index("by_key", ["key"])
		.index("by_expiresAt", ["expiresAt"]),
});
