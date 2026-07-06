import { expect, test } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import { generateFlowData } from "./gh-flow-generator";

test("generateFlowData creates edges with correct structure", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");

	const parsed = buildGhJson(xml, { includeVisuals: true });

	const { nodes, edges } = generateFlowData(parsed);

	expect(nodes.length).toBeGreaterThan(0);
	expect(edges.length).toBeGreaterThan(0);

	const nodeIds = new Set(nodes.map((n) => n.id));

	edges.forEach((edge) => {
		expect(edge.id).toBeDefined();
		expect(edge.source).toBeDefined();
		expect(edge.target).toBeDefined();
		expect(edge.targetHandle).toBeDefined();
		expect(edge.sourceHandle).toBeDefined();
		expect(edge.type).toBe("default");
		expect(nodeIds.has(edge.source)).toBe(true);
		expect(nodeIds.has(edge.target)).toBe(true);
	});
});

test("generateFlowData creates correct number of edges from wires", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");

	const parsed = buildGhJson(xml, { includeVisuals: true });

	const wireCount = parsed.wires.length;
	const { edges } = generateFlowData(parsed);

	expect(edges.length).toBe(wireCount);
});

test("edge targetHandle format is componentId.portName", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");

	const parsed = buildGhJson(xml, { includeVisuals: true });
	const { edges } = generateFlowData(parsed);

	edges.forEach((edge) => {
		const targetParts = edge.targetHandle?.split(".") ?? [];
		expect(targetParts.length).toBeGreaterThanOrEqual(1);
	});
});

test("edge sourceHandle format is componentId.portName", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");

	const parsed = buildGhJson(xml, { includeVisuals: true });
	const { edges } = generateFlowData(parsed);

	edges.forEach((edge) => {
		expect(edge.sourceHandle).toBeDefined();
		const sourceParts = edge.sourceHandle?.split(".") ?? [];
		expect(sourceParts.length).toBeGreaterThanOrEqual(1);
	});
});
