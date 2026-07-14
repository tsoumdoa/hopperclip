function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value === null || typeof value !== "object") return value;

	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, entry]) => [key, canonicalize(entry)])
	);
}

export function semanticEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}
