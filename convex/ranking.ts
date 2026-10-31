export const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
export const TAU_MS = HALF_LIFE_MS / Math.LN2;
export const USAGE_DEBOUNCE_MS = 60_000;
export const T0 = Date.UTC(2025, 0, 1);
export const weights = { created: 3, modified: 1, copy: 1 } as const;

export function logAddExp(a: number | undefined, b: number): number {
	if (a === undefined) return b;
	const max = Math.max(a, b);
	return max + Math.log1p(Math.exp(Math.min(a, b) - max));
}

export function addEvent(
	heat: number | undefined,
	weight: number,
	atMs: number
): number {
	return logAddExp(heat, Math.log(weight) + (atMs - T0) / TAU_MS);
}

export function seedHeat(post: {
	heat?: number;
	dateCreated: string;
	dateUpdated: string;
}): number {
	if (post.heat !== undefined) return post.heat;
	const created = Date.parse(post.dateCreated);
	const updated = Date.parse(post.dateUpdated);
	let heat = addEvent(undefined, weights.created, created);
	if (Math.abs(updated - created) > 1000)
		heat = addEvent(heat, weights.modified, updated);
	return heat;
}
