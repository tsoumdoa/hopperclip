export const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
export const T0 = Date.UTC(2025, 0, 1);
export const weights = { created: 3, modified: 1, copy: 1 };

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
	return logAddExp(
		heat,
		Math.log(weight) + (atMs - T0) / (HALF_LIFE_MS / Math.LN2)
	);
}
