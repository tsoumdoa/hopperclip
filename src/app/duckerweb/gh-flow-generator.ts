import type { Edge } from "@xyflow/react";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { generateNodes } from "./lib/node-generator";
import { generateEdges } from "./lib/edge-generator";
import type { GHNode } from "./types/type";

export function generateFlowData(parsed: ParsedGrasshopper): {
	nodes: GHNode[];
	edges: Edge[];
} {
	const nodes = generateNodes(parsed.components);
	const nodeIds = new Set(nodes.map((n) => n.id));
	const edges = generateEdges(parsed.wires, nodeIds);

	return { nodes, edges };
}

/** Parse Grasshopper XML into flow graph data, or null if parsing fails. */
export function createFlowPreview(xml: string): {
	nodes: GHNode[];
	edges: Edge[];
} | null {
	try {
		const parsed = buildGhJson(xml, { includeVisuals: true });
		return generateFlowData(parsed);
	} catch {
		return null;
	}
}
