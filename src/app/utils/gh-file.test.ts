import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { expect, test } from "vitest";
import { buildGhJson } from "parser/src/parser";
import { ghFileToGhXml } from "./gh-file";
import { normalizeGhXmlForClipboard, validateGhXml } from "./gh-xml";
import {
	GhSizeError,
	grasshopperBinaryToXml,
	inflateGrasshopperBinary,
} from "./gh-binary";

// Frozen synthetic GH_IO archive: one component with identity, geometry and
// visual metadata. Keeping bytes avoids maintaining a second binary serializer.
const native = new Uint8Array(
	readFileSync(new URL("./__fixtures__/native.gh", import.meta.url))
);

test("imports a native GH archive into the clipboard and semantic graph", async () => {
	const xml = await ghFileToGhXml(new File([native], "definition.gh"));
	const parsed = buildGhJson(xml, { includeVisuals: true });

	expect(validateGhXml(xml).isValid).toBe(true);
	expect(xml).toContain('<chunk name="Clipboard">');
	expect(xml).not.toContain('<chunk name="Definition">');
	expect(parsed.components.NATIVE).toMatchObject({
		type: "Native Component",
		typeGuid: "11111111-2222-3333-4444-555555555555",
		instanceGuid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
		visuals: { pivot: { x: 60, y: 42 } },
	});
	expect(parsed.metadata?.pluginVersion).toBe("1.0.8");
});

test("converts full GHX definitions to valid clipboard XML without file-only chunks", async () => {
	const clipboard = readFileSync(
		"parser/sand/xmls/csharp-component.xml",
		"utf8"
	);
	const definition = clipboard
		.replace('<chunks count="1">', '<chunks count="2">')
		.replace('<chunk name="Clipboard">', '<chunk name="Definition">')
		.replace(
			"  </chunks>\n</Archive>",
			'    <chunk name="Thumbnail"><items count="0"></items></chunk>\n  </chunks>\n</Archive>'
		);
	const xml = await ghFileToGhXml(new File([definition], "definition.ghx"));

	expect(validateGhXml(xml).isValid).toBe(true);
	expect(xml).toContain('<chunk name="Clipboard">');
	expect(xml).not.toContain('name="Definition"');
	expect(xml).not.toContain('name="Thumbnail"');
	expect(buildGhJson(xml)).toEqual(buildGhJson(clipboard));
});

test("bounds decompressed bytes and XML expansion independently", () => {
	expect(() => inflateGrasshopperBinary(native.buffer, 16)).toThrow(
		GhSizeError
	);
	expect(() => grasshopperBinaryToXml(inflateRawSync(native), 16)).toThrow(
		GhSizeError
	);
});

test("copying pasted GhXml preserves clipboard contents exactly", () => {
	const clipboard = readFileSync(
		"parser/sand/xmls/csharp-component.xml",
		"utf8"
	);
	expect(normalizeGhXmlForClipboard(clipboard)).toBe(clipboard);
});

test.each(["\n", "\r\n"])(
	"copies a pasted definition without file-only siblings or changes to embedded XML (%j line endings)",
	(newline) => {
		const embeddedXml =
			'<![CDATA[<chunk name="Definition"></chunk></chunks>]]>';
		const clipboard = readFileSync(
			"parser/sand/xmls/csharp-component.xml",
			"utf8"
		)
			.replace(/\r\n?/g, "\n")
			.replace(/\n/g, newline)
			.replace("Shaded", embeddedXml)
			.replace(
				'<chunk name="DocumentHeader">',
				`<!-- <chunk name="Definition"> -->${newline}        <chunk name="DocumentHeader">`
			);
		const definition = clipboard
			.replace('<chunks count="1">', '<chunks count="3">')
			.replace(
				'<chunk name="Clipboard">',
				`<chunk name="Thumbnail"><chunks count="0" /></chunk>${newline}    <chunk name="Definition">`
			)
			.replace(
				`  </chunks>${newline}</Archive>`,
				`    <chunk name="Preview" />${newline}  </chunks>${newline}</Archive>`
			);
		const result = normalizeGhXmlForClipboard(definition);

		expect(validateGhXml(result).isValid).toBe(true);
		expect(result).toBe(clipboard);
		expect(buildGhJson(result)).toEqual(buildGhJson(definition));
		expect(normalizeGhXmlForClipboard(result)).toBe(result);
	}
);
