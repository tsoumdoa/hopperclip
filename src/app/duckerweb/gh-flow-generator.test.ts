import { expect, test } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import { generateFlowData } from "./gh-flow-generator";

test("generateFlowData maps wires onto connected source/target nodes", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
	const parsed = buildGhJson(xml, { includeVisuals: true });
	const { nodes, edges } = generateFlowData(parsed);
	const nodeIds = new Set(nodes.map((n) => n.id));

	expect(edges).toHaveLength(parsed.wires.length);
	for (const edge of edges) {
		expect(nodeIds.has(edge.source)).toBe(true);
		expect(nodeIds.has(edge.target)).toBe(true);
	}
});

test("generateFlowData preserves wire display styles", () => {
	const xml = fs.readFileSync("parser/sand/xmls/brep-area-Wire.xml", "utf8");
	const parsed = buildGhJson(xml, { includeVisuals: true });
	const wire = parsed.wires[0];
	parsed.wires = [
		{ ...wire, style: "faint" },
		{ ...wire, style: "hidden" },
	];

	const { edges } = generateFlowData(parsed);

	expect(edges[0].data?.wireStyle).toBe("faint");
	expect(edges[1].data?.wireStyle).toBe("hidden");
});

test("generateFlowData reads faint wire styles from Grasshopper XML", () => {
	const xml = fs.readFileSync(
		"parser/sand/xmls/user_2wqbnxvyl1Wpms6P31fLGrwH2c3_w01KJ2ROEV8GrxvrtHv1A.xml",
		"utf8"
	);
	const parsed = buildGhJson(xml, { includeVisuals: true });

	expect(parsed.wires.some((wire) => wire.style === "faint")).toBe(true);
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

	expect(mappedNode?.type).toBe("relay");
	expect(mappedNode?.data.outputs[0]?.options?.mapping).toBe("flatten");
});
