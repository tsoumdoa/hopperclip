import { expect, test } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/sand/src/parser";
import {
	getSingleScriptNickName,
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
