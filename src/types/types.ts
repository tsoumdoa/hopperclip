import { z } from "zod";
import type { FunctionReturnType } from "convex/server";
import { Doc } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";

export type GhPost = Doc<"post">; // includes _id, _creationTime, fields
export type GetSharedPost = FunctionReturnType<typeof api.ghCard.getSharedPost>;

export const GhCardSchema = z.object({
	name: z.string().min(3).max(30),
	description: z.string().max(150),
	tags: z.array(z.string()).max(20),
});

export type GhCard = z.infer<typeof GhCardSchema>;

export const MAX_COMPRESSED_GH_XML_BYTES = 25 * 1024 * 1024;
export const MAX_DECOMPRESSED_GH_XML_BYTES = 100 * 1024 * 1024;

const StorageKeyRegex = /^[A-Za-z0-9_-]{1,64}$/;
export const StorageKeySchema = z.string().regex(StorageKeyRegex, {
	message: "Invalid storage key format.",
});

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const GhXml = z.object({
	Archive: z.object({
		comments: z
			.array(z.union([z.literal("Grasshopper archive"), z.string()]))
			.length(3),
	}),
});

const ShareLinkUidRegex = /^[a-z0-9]{10}$/;
export const ShareLinkUidSchema = z.string().regex(ShareLinkUidRegex, {
	message: "Invalid Nano ID format. Must be 10 characters using 0-9 and a-z.",
});

export type ShareLinkUid = z.infer<typeof ShareLinkUidSchema>;

//this is not good idea...duplicating typing with zod
export const SORT_ORDERS = [
	{ value: "ascAZ", label: "A-Z" },
	{ value: "descZA", label: "Z-A" },
	{ value: "ascLastEdited", label: "Last Edited Date (Newest)" },
	{ value: "descLastEdited", label: "Last Edited Date (Oldest)" },
	{ value: "ascCreated", label: "Creation Date (Newest)" },
	{ value: "descCreated", label: "Creation Date (Oldest)" },
] as const;

export const SortOrderZenum = z.enum([
	"ascAZ",
	"descZA",
	"ascLastEdited",
	"descLastEdited",
	"ascCreated",
	"descCreated",
]);
export type SortOrder = (typeof SORT_ORDERS)[number]["value"];
export type SortOrderValue = (typeof SORT_ORDERS)[number]["label"];
export type UserTag = {
	tag: string;
	count: number;
};
