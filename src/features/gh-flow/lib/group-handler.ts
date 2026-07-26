import type { Component } from "parser/src/types";
import type { GHNode, GHNodeData } from "../types";
import type { NodePosition } from "./node-positions";

export function handleGroup(
	component: Component,
	nodePositions: Map<string, NodePosition>
): GHNode {
	const bounds = component.visuals?.bounds
		? component.visuals.bounds
		: computeGroupBounds(component.members ?? [], nodePositions);

	const nodeData: GHNodeData = {
		label: component.nickName,
		type: "group",
		inputs: [],
		outputs: [],
		selected: component.state?.selected,
		members: component.members,
		groupColor: component.visuals?.color,
		containerBounds: bounds.width > 0 && bounds.height > 0 ? bounds : undefined,
	};

	return {
		id: component.id,
		type: "group",
		position: { x: bounds.x, y: bounds.y },
		style:
			bounds.width > 0 && bounds.height > 0
				? { width: bounds.width, height: bounds.height }
				: undefined,
		data: nodeData,
		className: [
			component.state?.hidden && "gh-runtime-node--hidden",
			(component.state?.locked || component.state?.frozen) &&
				"gh-runtime-node--locked",
		]
			.filter(Boolean)
			.join(" "),
		zIndex: 0,
	} as GHNode;
}

function computeGroupBounds(
	members: string[],
	nodePositions: Map<string, NodePosition>
): { x: number; y: number; width: number; height: number } {
	const padding = 10;
	const memberBounds = members
		.map((id) => nodePositions.get(id) ?? null)
		.filter((b): b is NonNullable<typeof b> => b !== null);
	if (memberBounds.length === 0) return { x: 0, y: 0, width: 160, height: 80 };

	const xs = memberBounds.map((b) => b.x);
	const ys = memberBounds.map((b) => b.y);
	const rights = memberBounds.map((b) => b.x + b.width);
	const bottoms = memberBounds.map((b) => b.y + b.height);

	return {
		x: Math.min(...xs) - padding,
		y: Math.min(...ys) - padding,
		width: Math.max(...rights) - Math.min(...xs) + padding * 2,
		height: Math.max(...bottoms) - Math.min(...ys) + padding * 2,
	};
}
