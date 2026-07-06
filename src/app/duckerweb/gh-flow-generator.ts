import type { ParsedGrasshopper } from "parser/sand/src/types";
import { generateNodes } from "./lib/node-generator";
import { generateEdges } from "./lib/edge-generator";
import type { GHNode } from "./types/type";

export function generateFlowData(parsed: ParsedGrasshopper): {
	nodes: GHNode[];
	edges: import("@xyflow/react").Edge[];
} {
	const nodes = generateNodes(parsed.components);
	const nodeIds = new Set(nodes.map((n) => n.id));
	const edges = generateEdges(parsed.wires, nodeIds);

	return { nodes, edges };
}
