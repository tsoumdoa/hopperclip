import { describe, expect, test } from "vitest";
import { isFileDragEvent } from "./gh-page-file-drop-layer";

describe("isFileDragEvent", () => {
	test("returns true when the drag payload includes Files", () => {
		expect(
			isFileDragEvent({
				dataTransfer: {
					types: ["Files"],
				} as unknown as DataTransfer,
			})
		).toBe(true);
	});

	test("returns false when the drag payload has no Files type", () => {
		expect(
			isFileDragEvent({
				dataTransfer: {
					types: ["text/plain"],
				} as unknown as DataTransfer,
			})
		).toBe(false);
	});

	test("returns false when dataTransfer is missing", () => {
		expect(isFileDragEvent({ dataTransfer: null })).toBe(false);
	});
});
