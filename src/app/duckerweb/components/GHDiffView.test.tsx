import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { ComparisonActions } from "./GHDiffView";

test("comparison actions advertise the native paste shortcut", () => {
	const html = renderToStaticMarkup(
		<ComparisonActions onPaste={vi.fn()} onFileSelected={vi.fn()} />
	);
	expect(html).toContain("Paste changed GhXml");
	expect(html).toContain("Ctrl+V");
});
