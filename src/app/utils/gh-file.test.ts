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

test("Combine Data keeps numeric input nicknames and their wires resolve", () => {
	const xml = readFileSync("parser/sand/xmls/all.xml", "utf8");
	const wired = xml.replace(
		/(<item name="InstanceGuid"[^>]*>(?:48b4476c-f728-44eb-90bd-1be4b8f3eb01|88be08ee-25bf-4ea0-a8de-7375aabb3e21)<\/item>)/g,
		'$1<item name="Source" index="0" type_name="gh_guid">c0741a52-0e9f-41be-84a9-8091bcc78b99</item>'
	);
	const graph = buildGhJson(wired);
	const combine = Object.values(graph.components).find(
		(c) => c.type === "Combine Data"
	)!;
	expect(Object.keys(combine.inputs)).toEqual(["0", "1"]);
	for (const key of ["0", "1"]) {
		expect(combine.inputs[key].nick).toBe(key);
		expect(graph.wires.find((w) => w.to === `${combine.id}.${key}`)?.from).toBe(
			`${combine.id}.r`
		);
	}
});

test.each(["007", "1e3", "true", "false"])(
	"GH string nickname %s retains its text",
	(value) => {
		const xml = readFileSync("parser/sand/xmls/all.xml", "utf8");
		const graph = buildGhJson(
			xml.replace(
				/(<item name="NickName" type_name="gh_string"[^>]*>)0(<\/item>)/g,
				`$1${value}$2`
			)
		);
		const combine = Object.values(graph.components).find(
			(c) => c.type === "Combine Data"
		)!;
		expect(Object.values(combine.inputs).map((p) => p.nick)).toContain(value);
	}
);
