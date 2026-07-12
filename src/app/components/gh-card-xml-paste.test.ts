import { describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import {
	getSingleScriptNickName,
	ingestGhXml,
	sanitizeGhCardName,
} from "./gh-card-xml-paste";

test("sanitizeGhCardName strips disallowed characters", () => {
	expect(sanitizeGhCardName("MyScript:foo")).toBe("MyScriptfoo");
});

test("sanitizeGhCardName trims whitespace and strips symbols", () => {
	expect(sanitizeGhCardName("  C#  ")).toBe("C");
});

test("sanitizeGhCardName truncates to 30 characters", () => {
	const longName = "A".repeat(40);
	expect(sanitizeGhCardName(longName)).toBe("A".repeat(30));
});

test("getSingleScriptNickName returns sanitized nickName for single script component", () => {
	const xml = fs.readFileSync("parser/sand/xmls/csharp-component.xml", "utf8");
	const parsed = buildGhJson(xml);

	expect(getSingleScriptNickName(parsed)).toBe("C");
});

test("getSingleScriptNickName returns undefined for non-script single component", () => {
	const xml = fs.readFileSync("parser/sand/xmls/relay-single.xml", "utf8");
	const parsed = buildGhJson(xml);

	expect(getSingleScriptNickName(parsed)).toBeUndefined();
});

test("getSingleScriptNickName returns undefined for multi-component paste", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
	const parsed = buildGhJson(xml);

	expect(getSingleScriptNickName(parsed)).toBeUndefined();
});

describe("ingestGhXml", () => {
	const validXml = fs.readFileSync(
		"parser/sand/xmls/csharp-component.xml",
		"utf8"
	);

	test("returns isValid=true for parseable GhXml", () => {
		const result = ingestGhXml(validXml, "clipboard");
		expect(result.isValid).toBe(true);
		expect(result.xml).toBe(validXml);
		expect(result.errorMsg).toBeUndefined();
	});

	test("returns isValid=false with file-source error prefix", () => {
		const result = ingestGhXml("not a real archive", "file");
		expect(result.isValid).toBe(false);
		expect(result.errorMsg).toMatch(/^Selected.*not valid/);
		expect(result.xml).toBeUndefined();
	});

	test("returns isValid=false with clipboard-source error prefix", () => {
		const result = ingestGhXml("not a real archive", "clipboard");
		expect(result.isValid).toBe(false);
		expect(result.errorMsg).toMatch(/^Pasted.*not valid/);
	});

	test("rejects malformed quote-stripped XML", () => {
		const malformed = validXml.replaceAll('="', "=").replaceAll('"', "");
		const result = ingestGhXml(malformed, "clipboard");
		expect(result.isValid).toBe(false);
		expect(result.errorMsg).toContain("Malformed XML");
	});

	test("invokes onSingleScriptComponent for single-script valid XML", () => {
		const spy = vi.fn();
		ingestGhXml(validXml, "file", { onSingleScriptComponent: spy });
		expect(spy).toHaveBeenCalledWith("C");
	});

	test("does not invoke onSingleScriptComponent for multi-component XML", () => {
		const spy = vi.fn();
		const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
		ingestGhXml(xml, "file", { onSingleScriptComponent: spy });
		expect(spy).not.toHaveBeenCalled();
	});
});
