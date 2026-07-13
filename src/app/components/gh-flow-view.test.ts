import { expect, test } from "vitest";
import fs from "node:fs";
import { createFlowPreview } from "./gh-flow-preview";

test("createFlowPreview creates graph data from valid Grasshopper XML", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
	const preview = createFlowPreview(xml);

	expect(preview).not.toBeNull();
	expect(preview?.nodes.length).toBeGreaterThan(0);
	expect(preview?.edges.length).toBeGreaterThan(0);
});

test("createFlowPreview returns null for invalid XML", () => {
	expect(createFlowPreview("not Grasshopper XML")).toBeNull();
});
