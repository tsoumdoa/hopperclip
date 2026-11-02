import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { useCardPreviewPreference } from "./use-card-preview-preference";

function Preference() {
	return createElement("span", null, useCardPreviewPreference().cardPreview);
}

afterEach(() => vi.unstubAllGlobals());

test.each(["off", "recipe", "thumbnail", "invalid", null])(
	"reads %s before the first render without waiting for an effect",
	(value) => {
		const getItem = vi.fn().mockReturnValue(value);
		vi.stubGlobal("localStorage", { getItem });
		expect(renderToStaticMarkup(createElement(Preference))).toBe(
			`<span>${value === "off" || value === "recipe" ? value : "thumbnail"}</span>`
		);
		expect(getItem).toHaveBeenCalledWith("hopperclip:card-preview");
	}
);

test("falls back to thumbnail when localStorage is unavailable", () => {
	vi.stubGlobal("localStorage", {
		getItem: () => {
			throw new Error("Storage is unavailable");
		},
	});
	expect(renderToStaticMarkup(createElement(Preference))).toBe(
		"<span>thumbnail</span>"
	);
});
