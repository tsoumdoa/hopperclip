import { describe, expect, test } from "vitest";
import { resolveDuckerwebImportView } from "./use-duckerweb-state";

describe("resolveDuckerwebImportView", () => {
	test("opens dropped files in Flow regardless of the current view", () => {
		expect(resolveDuckerwebImportView("list", "file")).toBe("flow");
		expect(resolveDuckerwebImportView("json", "file")).toBe("flow");
		expect(resolveDuckerwebImportView("diff", "file")).toBe("flow");
	});

	test("continues to open clipboard imports in Flow", () => {
		expect(resolveDuckerwebImportView("list", "clipboard")).toBe("flow");
	});
});
