import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { shouldConsumeNativeGhXmlPaste } from "./use-native-gh-xml-paste";

const validGhXml = fs.readFileSync(
	"parser/sand/xmls/csharp-component.xml",
	"utf8"
);

describe("shouldConsumeNativeGhXmlPaste", () => {
	test("does not consume paste while disabled", () => {
		expect(
			shouldConsumeNativeGhXmlPaste({
				enabled: false,
				text: validGhXml,
				editableTarget: false,
			})
		).toBe(false);
	});

	test("consumes non-editable paste so invalid content can show feedback", () => {
		expect(
			shouldConsumeNativeGhXmlPaste({
				enabled: true,
				text: "not GhXml",
				editableTarget: false,
			})
		).toBe(true);
	});

	test("preserves ordinary text paste in editable fields", () => {
		expect(
			shouldConsumeNativeGhXmlPaste({
				enabled: true,
				text: "ordinary field text",
				editableTarget: true,
				allowValidGhXmlInEditable: true,
			})
		).toBe(false);
	});

	test("consumes valid GhXml in editable fields when smart detection is enabled", () => {
		expect(
			shouldConsumeNativeGhXmlPaste({
				enabled: true,
				text: validGhXml,
				editableTarget: true,
				allowValidGhXmlInEditable: true,
			})
		).toBe(true);
	});

	test("keeps page-level editable pastes native even when they contain GhXml", () => {
		expect(
			shouldConsumeNativeGhXmlPaste({
				enabled: true,
				text: validGhXml,
				editableTarget: true,
			})
		).toBe(false);
	});
});
