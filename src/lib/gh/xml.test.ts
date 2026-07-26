import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { normalizeGhXmlForClipboard, validateGhXml } from "./xml";

const CLIPBOARD_XML = fs.readFileSync(
	"parser/sand/xmls/csharp-component.xml",
	"utf8"
);

describe("normalizeGhXmlForClipboard", () => {
	test("leaves an existing clipboard archive byte-for-byte unchanged", () => {
		expect(normalizeGhXmlForClipboard(CLIPBOARD_XML)).toBe(CLIPBOARD_XML);
	});

	test("converts a full definition and removes file-only root chunks", () => {
		const definitionXml = CLIPBOARD_XML.replace(
			'<chunks count="1">',
			'<chunks count="2">'
		)
			.replace('<chunk name="Clipboard">', '<chunk name="Definition">')
			.replace(
				"  </chunks>\n</Archive>",
				'    <chunk name="Thumbnail"><items count="0"></items></chunk>\n  </chunks>\n</Archive>'
			);

		const normalized = normalizeGhXmlForClipboard(definitionXml);

		expect(normalized).toContain('<chunks count="1">');
		expect(normalized).toContain('<chunk name="Clipboard">');
		expect(normalized).not.toContain('name="Definition"');
		expect(normalized).not.toContain('name="Thumbnail"');
		expect(normalized).toContain("<Major>0</Major>");
		expect(validateGhXml(normalized).isValid).toBe(true);
	});
});
