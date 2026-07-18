import { describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import {
	getSingleScriptNickName,
	ingestGhXml,
} from "./gh-card-xml-paste";

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
