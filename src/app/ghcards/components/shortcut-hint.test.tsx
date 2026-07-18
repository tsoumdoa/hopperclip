import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ShortcutHint } from "./shortcut-hint";

test("shows filter, add, and native paste shortcuts", () => {
	const html = renderToStaticMarkup(<ShortcutHint />);
	expect(html).toContain("Filter");
	expect(html).toContain("Add");
	expect(html).toContain("Paste");
	expect(html).toContain(">V</kbd>");
});
