function definedKeys(value: Record<string, unknown>): string[] {
	return Object.keys(value).filter((key) => value[key] !== undefined);
}

/**
 * Structural equality that ignores key order and treats keys set to
 * `undefined` as absent, so parser output compares by content only.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (
		typeof a !== "object" ||
		typeof b !== "object" ||
		a === null ||
		b === null
	) {
		return false;
	}

	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((entry, index) => deepEqual(entry, b[index]))
		);
	}

	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = definedKeys(left);
	return (
		keys.length === definedKeys(right).length &&
		keys.every((key) => deepEqual(left[key], right[key]))
	);
}
