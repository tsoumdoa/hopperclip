import { describe, expect, it } from "vitest";
import { isNewCard, NEW_CARD_WINDOW_MS, newCardExpiresAt } from "./new-card";

const created = "2026-11-20T00:00:00.000Z";
const createdMs = Date.parse(created);

describe("isNewCard", () => {
	it("shows for an uncopied card inside the window", () => {
		expect(isNewCard({ dateCreated: created, usageCount: 0 }, createdMs)).toBe(
			true
		);
		expect(
			isNewCard(
				{ dateCreated: created, usageCount: 0 },
				createdMs + NEW_CARD_WINDOW_MS - 1
			)
		).toBe(true);
	});

	it("treats a missing usage count as never copied", () => {
		expect(isNewCard({ dateCreated: created }, createdMs + 1)).toBe(true);
	});

	it("hides once the window has passed", () => {
		expect(
			isNewCard(
				{ dateCreated: created, usageCount: 0 },
				createdMs + NEW_CARD_WINDOW_MS
			)
		).toBe(false);
	});

	it("hides as soon as the card has been copied", () => {
		expect(isNewCard({ dateCreated: created, usageCount: 1 }, createdMs)).toBe(
			false
		);
		expect(newCardExpiresAt({ dateCreated: created, usageCount: 3 })).toBe(
			null
		);
		expect(isNewCard({ dateCreated: created, usageCount: -1 }, createdMs)).toBe(
			false
		);
	});

	it("hides when the created date cannot be parsed", () => {
		expect(newCardExpiresAt({ dateCreated: "", usageCount: 0 })).toBe(null);
		expect(isNewCard({ dateCreated: "not a date", usageCount: 0 })).toBe(false);
	});
});
