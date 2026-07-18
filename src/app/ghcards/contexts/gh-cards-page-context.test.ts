import { describe, expect, test } from "vitest";
import {
	pendingGhCardFileImport,
	pendingGhCardXmlImport,
} from "./gh-cards-page-context";

describe("pending GH card imports", () => {
	test("a pending file clears pending XML", () => {
		const file = { name: "definition.gh" } as File;
		expect(pendingGhCardFileImport(file)).toEqual({
			pendingFile: file,
			pendingXml: null,
		});
	});

	test("pending XML clears the pending file", () => {
		expect(pendingGhCardXmlImport("<Archive />")).toEqual({
			pendingFile: null,
			pendingXml: "<Archive />",
		});
	});
});
