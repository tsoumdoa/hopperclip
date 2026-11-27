import { useEffect, useState } from "react";

// setTimeout overflows past this and fires immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * True while `deadline` (epoch ms) is in the future. Re-renders once when it
 * passes, so time-limited UI disappears without a page refresh. NaN is never
 * before anything.
 */
export function useIsBefore(deadline: number): boolean {
	const [tick, setTick] = useState(0);
	const before = deadline > Date.now();
	useEffect(() => {
		const delay = deadline - Date.now();
		if (!(delay > 0)) return;
		const timer = setTimeout(
			() => setTick((value) => value + 1),
			Math.min(delay, MAX_TIMEOUT_MS)
		);
		return () => clearTimeout(timer);
	}, [deadline, tick]);
	return before;
}
