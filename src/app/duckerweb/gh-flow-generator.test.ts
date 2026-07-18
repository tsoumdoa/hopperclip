import { expect, test } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import { createFlowPreview, generateFlowData } from "./gh-flow-generator";

test("generateFlowData builds nodes and wires into a connected flow graph", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
	const parsed = buildGhJson(xml, { includeVisuals: true });
	const { nodes, edges } = generateFlowData(parsed);
	const nodeIds = new Set(nodes.map((n) => n.id));

	expect(nodes.length).toBeGreaterThan(0);
	expect(edges).toHaveLength(parsed.wires.length);
	for (const edge of edges) {
		expect(nodeIds.has(edge.source)).toBe(true);
		expect(nodeIds.has(edge.target)).toBe(true);
		expect(edge.sourceHandle).toBeTruthy();
		expect(edge.targetHandle).toBeTruthy();
		expect(edge.type).toBe("default");
	}
});

test("createFlowPreview returns null for invalid XML", () => {
	expect(createFlowPreview("not Grasshopper XML")).toBeNull();
});

test("generateFlowData carries combined port options onto nodes", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
	const parsed = buildGhJson(xml, { includeVisuals: true });
	const component = Object.values(parsed.components).find(
		(candidate) =>
			Object.keys(candidate.inputs).length > 0 &&
			Object.keys(candidate.outputs).length > 0
	);

	expect(component).toBeDefined();
	if (!component) return;

	const input = Object.values(component.inputs)[0];
	const output = Object.values(component.outputs)[0];
	input.options = {
		mapping: "flatten",
		simplify: true,
		reverse: true,
		expression: "x * 2",
	};
	output.options = { mapping: "graft", simplify: true };

	const { nodes } = generateFlowData(parsed);
	const node = nodes.find((candidate) => candidate.id === component.id);

	expect(node?.data.inputs[0]?.options).toEqual(input.options);
	expect(node?.data.outputs[0]?.options).toEqual(output.options);
});

test("generateFlowData exposes standalone parameter internal expressions", () => {
	const xml = fs.readFileSync(
		"parser/sand/xmls/flatten-internal-expression.xml",
		"utf8"
	);
	const parsed = buildGhJson(xml, { includeVisuals: true });
	const component = Object.values(parsed.components).find(
		(candidate) => candidate.internalExpression
	);

	expect(component?.internalExpression).toBeDefined();
	if (!component) return;

	const { nodes } = generateFlowData(parsed);
	const node = nodes.find((candidate) => candidate.id === component.id);

	expect(node?.data.outputs[0]?.options?.expression).toBe(
		component.internalExpression
	);

	const mappedParameter = Object.values(parsed.components).find(
		(candidate) =>
			Object.values(candidate.outputs)[0]?.options?.mapping === "flatten"
	);
	const mappedNode = nodes.find(
		(candidate) => candidate.id === mappedParameter?.id
	);

	expect(mappedParameter).toBeDefined();
	expect(mappedNode?.type).toBe("relay");
	expect(mappedNode?.data.outputs[0]?.options?.mapping).toBe("flatten");
});
