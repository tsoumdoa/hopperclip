import fs from "node:fs";
import { describe, expect, test } from "vitest";
import {
	prepareDuckerwebImport,
	resolveDuckerwebImportView,
	resolveDuckerwebPasteTarget,
} from "./use-duckerweb-state";

describe("resolveDuckerwebImportView", () => {
	test.each(["list", "flow", "json"] as const)(
		"opens Flow after a successful clipboard paste from %s",
		(currentView) => {
			expect(resolveDuckerwebImportView(currentView, "clipboard")).toBe("flow");
		}
	);

	test("preserves the current view for file imports", () => {
		expect(resolveDuckerwebImportView("list", "file")).toBe("list");
	});
});

describe("resolveDuckerwebPasteTarget", () => {
	test("routes Diff pastes to the comparison definition", () => {
		expect(resolveDuckerwebPasteTarget("diff")).toBe("comparison");
	});

	test.each(["list", "flow", "json"] as const)(
		"routes %s pastes to the original definition",
		(viewMode) => {
			expect(resolveDuckerwebPasteTarget(viewMode)).toBe("original");
		}
	);
});

describe("prepareDuckerwebImport", () => {
	test("prepares parsed data and flow state for a valid definition", () => {
		const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");

		const result = prepareDuckerwebImport(xml, "file");

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(Object.keys(result.parsedData.components).length).toBeGreaterThan(0);
		expect(result.nodes.length).toBeGreaterThan(0);
		expect(result.edges.length).toBeGreaterThan(0);
	});

	test("returns a source-specific error without producing replacement state", () => {
		const result = prepareDuckerwebImport("not GhXml", "clipboard");

		expect(result).toEqual(
			expect.objectContaining({
				ok: false,
				error: expect.stringContaining("Pasted GhXml is not valid"),
			})
		);
	});
});
