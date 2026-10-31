import { describe, expect, it } from "vitest";
import { shouldLoadMore } from "./use-infinite-scroll";
import { showEmptyState } from "./library-pagination";

describe("library pagination decisions", () => {
	it("loads only when allowed and the sentinel intersects", () => {
		expect(shouldLoadMore(false, true)).toBe(false);
		expect(shouldLoadMore(true, false)).toBe(false);
		expect(shouldLoadMore(true, true)).toBe(true);
	});
	it("waits for exhaustion before showing an empty state", () => {
		expect(showEmptyState(0, false)).toBe(false);
		expect(showEmptyState(0, true)).toBe(true);
		expect(showEmptyState(1, true)).toBe(false);
	});
});
