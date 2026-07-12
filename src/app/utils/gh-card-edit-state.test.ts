import { describe, expect, test } from "vitest";
import { updateEditingCardIds } from "./gh-card-edit-state";

describe("updateEditingCardIds", () => {
	test("keeps other cards registered when one exits edit mode", () => {
		let editingIds = new Set<string>();
		editingIds = updateEditingCardIds(editingIds, "card-a", true);
		editingIds = updateEditingCardIds(editingIds, "card-b", true);
		editingIds = updateEditingCardIds(editingIds, "card-a", false);

		expect([...editingIds]).toEqual(["card-b"]);
	});

	test("removes a card when it exits or unmounts", () => {
		const editingIds = updateEditingCardIds(
			new Set(["card-a"]),
			"card-a",
			false
		);

		expect(editingIds.size).toBe(0);
	});

	test("preserves identity when the registration already matches", () => {
		const editingIds = new Set(["card-a"]);

		expect(updateEditingCardIds(editingIds, "card-a", true)).toBe(editingIds);
		expect(updateEditingCardIds(editingIds, "card-b", false)).toBe(editingIds);
	});
});
