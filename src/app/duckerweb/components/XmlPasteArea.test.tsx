import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { XmlPasteArea } from "./XmlPasteArea";

const handlers = {
	onPaste: vi.fn(),
	onFileSelected: vi.fn(),
	onClear: vi.fn(),
};

describe("XmlPasteArea", () => {
	test("shows the initial import controls before a definition is loaded", () => {
		const html = renderToStaticMarkup(
			<XmlPasteArea
				xmlData={undefined}
				isValidXml={false}
				xmlError=""
				{...handlers}
			/>
		);

		expect(html).toContain("Import a Grasshopper definition");
		expect(html).toContain("Paste GhXml from Clipboard");
		expect(html).toContain("Drop .gh or .ghx file, or click to browse");
		expect(html).not.toContain("Paste new GhXml from Clipboard");
	});

	test("keeps replacement controls visible after a definition is loaded", () => {
		const html = renderToStaticMarkup(
			<XmlPasteArea
				xmlData="<Archive />"
				isValidXml
				xmlError="Replacement failed"
				{...handlers}
			/>
		);

		expect(html).toContain("Clear current definition");
		expect(html).toContain("✓ GhXml validated");
		expect(html).toContain("Paste new GhXml from Clipboard");
		expect(html).toContain("Drop a new .gh or .ghx file, or click to browse");
		expect(html).toContain("Replacement failed");
	});
});
