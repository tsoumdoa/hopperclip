import type { Component } from "parser/src/types";
import type { GHNode } from "../types";
import { getComponentNodeType } from "./node-classifier";
import { buildNodePositions } from "./node-positions";
import { handleGroup } from "./group-handler";
import { handleComponent } from "./component-handler";

export function generateNodes(components: Record<string, Component>): GHNode[] {
	const nodePositions = buildNodePositions(components);
	return Object.values(components).map((component) => {
		const nodeType = getComponentNodeType(component);
		return nodeType === "group"
			? handleGroup(component, nodePositions)
			: handleComponent(component, nodePositions, nodeType);
	});
}
