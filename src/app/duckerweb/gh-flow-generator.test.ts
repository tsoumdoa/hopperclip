import { expect, test } from "vitest";
import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import type { Component, ParsedGrasshopper } from "parser/src/types";
import { generateFlowData } from "./gh-flow-generator";
import { grasshopperArgbToCss } from "./lib/grasshopper-color";

function component(
	id: string,
	type: string,
	bounds: { x: number; y: number; width: number; height: number },
	inputs: Component["inputs"] = {},
	outputs: Component["outputs"] = {}
): Component {
	return {
		id,
		type,
		typeGuid: `${id}-type`,
		instanceGuid: `${id}-instance`,
		nickName: id,
		inputs,
		outputs,
		visuals: { bounds },
	};
}

test("generateFlowData preserves Grasshopper bounds for nodes and groups", () => {
	const division = component(
		"A/B",
		"Division",
		{ x: 80, y: 492, width: 55, height: 44 },
		{
			a: {
				nick: "A",
				instanceGuid: "division-a",
				visuals: {
					bounds: { x: 82, y: 494, width: 9, height: 20 },
					pivot: { x: 88, y: 504 },
				},
			},
			b: {
				nick: "B",
				instanceGuid: "division-b",
				visuals: {
					bounds: { x: 82, y: 514, width: 9, height: 20 },
					pivot: { x: 88, y: 524 },
				},
			},
		},
		{
			result: {
				nick: "R",
				instanceGuid: "division-result",
				visuals: {
					bounds: { x: 121, y: 494, width: 12, height: 40 },
					pivot: { x: 127, y: 514 },
				},
			},
		}
	);
	const sphere = component(
		"MSphere",
		"Mesh Sphere",
		{ x: 155, y: 502, width: 58, height: 84 },
		{
			base: {
				nick: "B",
				instanceGuid: "sphere-base",
				source: "A/B.result",
				visuals: {
					bounds: { x: 157, y: 504, width: 10, height: 20 },
					pivot: { x: 163.5, y: 514 },
				},
			},
			radius: {
				nick: "R",
				instanceGuid: "sphere-radius",
				visuals: {
					bounds: { x: 157, y: 524, width: 10, height: 20 },
					pivot: { x: 163.5, y: 534 },
				},
			},
			u: {
				nick: "U",
				instanceGuid: "sphere-u",
				visuals: {
					bounds: { x: 157, y: 544, width: 10, height: 20 },
					pivot: { x: 163.5, y: 554 },
				},
			},
			v: {
				nick: "V",
				instanceGuid: "sphere-v",
				visuals: {
					bounds: { x: 157, y: 564, width: 10, height: 20 },
					pivot: { x: 163.5, y: 574 },
				},
			},
		},
		{
			mesh: {
				nick: "M",
				instanceGuid: "sphere-mesh",
				visuals: {
					bounds: { x: 197, y: 504, width: 14, height: 80 },
					pivot: { x: 204, y: 544 },
				},
			},
		}
	);
	const group: Component = {
		...component("Group", "Group", { x: 0, y: 0, width: 0, height: 0 }),
		visuals: { color: "150;135;50;50" },
		members: [division.id, sphere.id],
	};
	const parsed: ParsedGrasshopper = {
		version: "0.2.2",
		components: { division, sphere, group },
		wires: [{ from: "A/B.result", to: "MSphere.base" }],
	};

	const { nodes } = generateFlowData(parsed);
	const divisionNode = nodes.find((node) => node.id === division.id);
	const sphereNode = nodes.find((node) => node.id === sphere.id);
	const groupNode = nodes.find((node) => node.id === group.id);

	expect(divisionNode?.position).toEqual({ x: 80, y: 492 });
	expect(divisionNode?.style).toMatchObject({ width: 55, height: 44 });
	expect(sphereNode?.position).toEqual({ x: 155, y: 502 });
	expect(sphereNode?.style).toMatchObject({ width: 58, height: 84 });
	expect(sphereNode?.data).toMatchObject({
		inputWidth: 12,
		outputWidth: 16,
		usesGrasshopperBounds: true,
	});
	expect(sphereNode?.data.inputs.map((port) => port.position)).toEqual([
		12 / 84,
		32 / 84,
		52 / 84,
		72 / 84,
	]);
	expect(sphereNode?.data.inputs[0]).toMatchObject({
		labelOffset: 2,
		labelWidth: 10,
	});
	expect(sphereNode?.data.outputs[0]?.position).toBe(42 / 84);
	expect(sphereNode?.data.outputs[0]).toMatchObject({
		labelOffset: 0,
		labelWidth: 14,
	});
	expect(groupNode?.position).toEqual({ x: 70, y: 482 });
	expect(groupNode?.style).toMatchObject({ width: 153, height: 114 });
	expect(groupNode?.data.groupColor).toBe("150;135;50;50");
});

test("Grasshopper ARGB colors retain their encoded opacity", () => {
	expect(grasshopperArgbToCss("150;135;50;50", "transparent")).toBe(
		"rgba(135, 50, 50, 0.5882352941176471)"
	);
	expect(grasshopperArgbToCss("invalid", "transparent")).toBe("transparent");
});

test("generateFlowData renders Scribble as positioned text annotation", () => {
	const scribble = component("Scribble", "Scribble", {
		x: 655,
		y: 15,
		width: 468.26172,
		height: 26.892578,
	});
	scribble.value = {
		type: "scribble",
		text: "Sinuous interlocking seam — native GH components only",
		font: "Arial",
		size: 18,
		bold: false,
		italic: false,
		corners: {
			a: { x: 660, y: 20 },
			b: { x: 1118.2617, y: 20 },
			c: { x: 1118.2617, y: 36.89258 },
			d: { x: 660, y: 36.89258 },
		},
	};

	const { nodes } = generateFlowData({
		version: "0.2.2",
		components: { scribble },
		wires: [],
	});
	const node = nodes[0];

	expect(node.type).toBe("scribble");
	expect(node.position).toEqual({ x: 655, y: 15 });
	expect(node.style).toMatchObject({ width: 468.26172, height: 26.892578 });
	expect(node.data.value).toBe(
		"Sinuous interlocking seam — native GH components only"
	);
	expect(node.data.scribble).toMatchObject({
		font: "Arial",
		size: 18,
		bold: false,
		italic: false,
		componentBounds: {
			x: 655,
			y: 15,
			width: 468.26172,
			height: 26.892578,
		},
	});
});

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
