import type { GhPost } from "@/types/types";

// A card reads as "New" for a week, or until it is first copied.
export const NEW_CARD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// How long the arrival ring stays on a card saved in this tab.
export const CARD_ARRIVAL_MS = 2600;

type NewCardFields = Pick<GhPost, "dateCreated" | "usageCount">;

/** When the "New" label stops showing, or null if it never shows. */
export function newCardExpiresAt(post: NewCardFields): number | null {
	if ((post.usageCount ?? 0) > 0) return null;
	const created = Date.parse(post.dateCreated);
	if (!Number.isFinite(created)) return null;
	return created + NEW_CARD_WINDOW_MS;
}

export function isNewCard(post: NewCardFields, now = Date.now()): boolean {
	const expiresAt = newCardExpiresAt(post);
	return expiresAt !== null && now < expiresAt;
}
