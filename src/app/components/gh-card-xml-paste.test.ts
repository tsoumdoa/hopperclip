import { describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import {
	getGhCardNameFromFileName,
	getSingleScriptNickName,
	ingestGhXml,
	sanitizeGhCardName,
	shouldAutoFillGhCardName,
} from "./gh-card-xml-paste";

describe("getGhCardNameFromFileName", () => {
	test("strips .gh/.ghx and clips to 30 characters", () => {
		expect(getGhCardNameFromFileName("Panelizer.gh")).toBe("Panelizer");
		expect(getGhCardNameFromFileName("MyFacade.GHX")).toBe("MyFacade");
		expect(getGhCardNameFromFileName("Facade.v2.gh")).toBe("Facade.v2");
		expect(getGhCardNameFromFileName(`${"A".repeat(40)}.gh`)).toBe(
			"A".repeat(30)
		);
	});
});

describe("shouldAutoFillGhCardName", () => {
	test("fills empty or previously auto-filled names only", () => {
		expect(shouldAutoFillGhCardName("", null)).toBe(true);
		expect(shouldAutoFillGhCardName("A", "A")).toBe(true);
		expect(shouldAutoFillGhCardName("Custom name", null)).toBe(false);
		expect(shouldAutoFillGhCardName("Custom name", "A")).toBe(false);
	});
});

describe("sanitizeGhCardName", () => {
	test("strips symbols, trims, and truncates", () => {
		expect(sanitizeGhCardName("MyScript:foo")).toBe("MyScriptfoo");
		expect(sanitizeGhCardName("  C#  ")).toBe("C");
		expect(sanitizeGhCardName("A".repeat(40))).toBe("A".repeat(30));
	});
});

describe("getSingleScriptNickName", () => {
	test("returns sanitized nickName only for a single script component", () => {
		const script = buildGhJson(
			fs.readFileSync("parser/sand/xmls/csharp-component.xml", "utf8")
		);
		expect(getSingleScriptNickName(script)).toBe("C");

		const relay = buildGhJson(
			fs.readFileSync("parser/sand/xmls/relay-single.xml", "utf8")
		);
		expect(getSingleScriptNickName(relay)).toBeUndefined();

		const multi = buildGhJson(
			fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8")
		);
		expect(getSingleScriptNickName(multi)).toBeUndefined();
	});
});

describe("ingestGhXml", () => {
	const validXml = fs.readFileSync(
		"parser/sand/xmls/csharp-component.xml",
		"utf8"
	);

	test("accepts parseable GhXml and rejects invalid/malformed input", () => {
		expect(ingestGhXml(validXml, "clipboard")).toEqual({
			isValid: true,
			xml: validXml,
		});

		const fileError = ingestGhXml("not a real archive", "file");
		expect(fileError.isValid).toBe(false);
		expect(fileError.errorMsg).toMatch(/^Selected.*not valid/);

		const clipboardError = ingestGhXml("not a real archive", "clipboard");
		expect(clipboardError.isValid).toBe(false);
		expect(clipboardError.errorMsg).toMatch(/^Pasted.*not valid/);

		const malformed = validXml.replaceAll('="', "=").replaceAll('"', "");
		expect(ingestGhXml(malformed, "clipboard").errorMsg).toContain(
			"Malformed XML"
		);
	});

	test("invokes onSingleScriptComponent only for single-script XML", () => {
		const spy = vi.fn();
		ingestGhXml(validXml, "file", { onSingleScriptComponent: spy });
		expect(spy).toHaveBeenCalledWith("C");

		const multi = fs.readFileSync(
			"parser/sand/xmls/brep-area-Wire.xml",
			"utf8"
		);
		ingestGhXml(multi, "file", { onSingleScriptComponent: spy });
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
