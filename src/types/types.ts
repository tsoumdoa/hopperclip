import { z } from "zod";
import { Doc } from "@convex/_generated/dataModel";

export type GhPost = Doc<"post">; // includes _id, _creationTime, fields
export type GetSharedPost = {
	post: { name: string; description?: string; tags?: string[] };
	sharedToken: string;
	shareToken: string;
	expiryDate: string;
} | null;

export const GhCardSchema = z.object({
	name: z.string().min(3).max(30),
	description: z.string().max(150),
	// Convex schema keeps v.array(v.string()); Zod enforces charset/length at mutation time.
	tags: z
		.array(
			z
				.string()
				.min(1)
				.max(20)
				.regex(/^[\p{L}\p{N}]+$/u)
		)
		.max(20),
});

export type GhCard = z.infer<typeof GhCardSchema>;

export const MAX_COMPRESSED_GH_XML_BYTES = 25 * 1024 * 1024;
export const MAX_DECOMPRESSED_GH_XML_BYTES = 100 * 1024 * 1024;

const StorageKeyRegex = /^[A-Za-z0-9_-]{1,64}$/;
export const StorageKeySchema = z.string().regex(StorageKeyRegex, {
	message: "Invalid storage key format.",
});

export const GhXml = z.object({
	Archive: z.object({
		comments: z
			.array(z.union([z.literal("Grasshopper archive"), z.string()]))
			.length(3),
	}),
});

// 15 base36 characters provide ~78 bits of entropy for compact capability URLs.
export const SHARE_LINK_UID_LENGTH = 15;
// Previously issued 10- and 25-character links keep working until expiry.
const ShareLinkUidRegex = new RegExp(
	`^(?:[a-z0-9]{10}|[a-z0-9]{25}|[a-z0-9]{${SHARE_LINK_UID_LENGTH}})$`
);
export const ShareLinkUidSchema = z.string().regex(ShareLinkUidRegex, {
	message: "Invalid share token format.",
});

export type ShareLinkUid = z.infer<typeof ShareLinkUidSchema>;

export const SORT_ORDERS = [
	{ value: "ascAZ", label: "A-Z" },
	{ value: "descZA", label: "Z-A" },
	{ value: "ascLastEdited", label: "Last Edited Date (Newest)" },
	{ value: "descLastEdited", label: "Last Edited Date (Oldest)" },
	{ value: "ascCreated", label: "Creation Date (Newest)" },
	{ value: "descCreated", label: "Creation Date (Oldest)" },
] as const;

export type SortOrder = (typeof SORT_ORDERS)[number]["value"];
export type SortOrderValue = (typeof SORT_ORDERS)[number]["label"];

// Derived from SORT_ORDERS so the values live in exactly one place.
export const SortOrderZenum = z.enum(
	SORT_ORDERS.map((o) => o.value) as [SortOrder, ...SortOrder[]]
);
export type UserTag = {
	tag: string;
	count: number;
};
