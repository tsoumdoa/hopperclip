import { describe, expect, test } from "vitest";
import {
	expressionPopupReducer,
	isExpressionPopupOpen,
	type ExpressionPopupMode,
} from "./expression-popup-state";

describe("expressionPopupReducer", () => {
	test("opens on hover and closes when the pointer leaves", () => {
		let mode: ExpressionPopupMode = "closed";
		mode = expressionPopupReducer(mode, { type: "hover-start" });
		expect(mode).toBe("hover");
		expect(isExpressionPopupOpen(mode)).toBe(true);

		mode = expressionPopupReducer(mode, { type: "hover-end" });
		expect(mode).toBe("closed");
		expect(isExpressionPopupOpen(mode)).toBe(false);
	});

	test("click pins the popup and ignores hover-end while pinned", () => {
		let mode: ExpressionPopupMode = "closed";
		mode = expressionPopupReducer(mode, { type: "click-trigger" });
		expect(mode).toBe("pinned");

		mode = expressionPopupReducer(mode, { type: "hover-end" });
		expect(mode).toBe("pinned");

		mode = expressionPopupReducer(mode, { type: "hover-start" });
		expect(mode).toBe("pinned");
	});

	test("second click toggles a pinned popup closed", () => {
		let mode: ExpressionPopupMode = "hover";
		mode = expressionPopupReducer(mode, { type: "click-trigger" });
		expect(mode).toBe("pinned");

		mode = expressionPopupReducer(mode, { type: "click-trigger" });
		expect(mode).toBe("closed");
	});

	test("dismiss closes hover and pinned states", () => {
		expect(expressionPopupReducer("hover", { type: "dismiss" })).toBe("closed");
		expect(expressionPopupReducer("pinned", { type: "dismiss" })).toBe(
			"closed"
		);
	});
});
