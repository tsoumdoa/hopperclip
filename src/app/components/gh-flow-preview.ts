import type { Edge } from "@xyflow/react";
import { buildGhJson } from "parser/src/parser";
import { generateFlowData } from "../duckerweb/gh-flow-generator";
import type { FlowNode } from "../duckerweb/types/type";

export function createFlowPreview(xml: string): {
	nodes: FlowNode[];
	edges: Edge[];
} | null {
	try {
		const parsed = buildGhJson(xml, { includeVisuals: true });
		return generateFlowData(parsed);
	} catch {
		return null;
	}
}
