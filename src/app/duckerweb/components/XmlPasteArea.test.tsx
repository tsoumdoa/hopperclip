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
		expect(html).toContain("Paste GhXml from clipboard");
		expect(html).toContain("Press Ctrl+V to paste GhXml");
		expect(html).toContain("Browse .gh or .ghx file");
		expect(html).toContain("drag and drop anywhere in this view");
		expect(html).not.toContain("Paste new GhXml");
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

		expect(html).toContain("Clear definition");
		expect(html).toContain("GhXml validated");
		expect(html).toContain("Paste new GhXml");
		expect(html).toContain("Browse for new file");
		expect(html).toContain("Replacement failed");
	});

	test("uses compact replacement controls inside the view toolbar", () => {
		const html = renderToStaticMarkup(
			<XmlPasteArea
				xmlData="<Archive />"
				isValidXml
				xmlError=""
				compact
				{...handlers}
			/>
		);

		expect(html).toContain("GhXml validated");
		expect(html).toContain("Paste new");
		expect(html).toContain("Ctrl+V");
		expect(html).toContain("Browse new");
		expect(html).toContain("Clear");
		expect(html).not.toContain("Paste new GhXml</span>");
	});
});
