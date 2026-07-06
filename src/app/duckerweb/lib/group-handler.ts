import type { Component } from "parser/src/types";
import type { GHNode, GHNodeData } from "../types/type";
import type { NodePosition } from "./node-positions";
import { POSITION_SCALE_X } from "../components/constants";

export function handleGroup(
	component: Component,
	nodePositions: Map<string, NodePosition>
): GHNode {
	const bounds = component.visuals?.bounds
		? {
				x: component.visuals.bounds.x * POSITION_SCALE_X,
				y: component.visuals.bounds.y,
				width: component.visuals.bounds.width * POSITION_SCALE_X,
				height: component.visuals.bounds.height,
		  }
		: computeGroupBounds(component.members ?? [], nodePositions);

	const nodeData: GHNodeData = {
		label: component.nickName,
		type: "group",
		inputs: [],
		outputs: [],
		selected: component.state?.selected,
		members: component.members,
		containerBounds:
			bounds.width > 0 && bounds.height > 0 ? bounds : undefined,
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
		zIndex: 0,
	} as GHNode;
}

function computeGroupBounds(
	members: string[],
	nodePositions: Map<string, NodePosition>
): { x: number; y: number; width: number; height: number } {
	const PAD = 12;
	const memberBounds = members
		.map((id) => nodePositions.get(id) ?? null)
		.filter((b): b is NonNullable<typeof b> => b !== null);
	if (memberBounds.length === 0) return { x: 0, y: 0, width: 160, height: 80 };

	const xs = memberBounds.map((b) => b.x);
	const ys = memberBounds.map((b) => b.y);
	const rights = memberBounds.map((b) => b.x + b.width);
	const bottoms = memberBounds.map((b) => b.y + b.height);

	const RIGHT_EXTRA = 30;
	const SINGLE_HEIGHT_BONUS = memberBounds.length === 1 ? PAD : 0;

	return {
		x: Math.min(...xs) - PAD,
		y: Math.min(...ys) - PAD,
		width: Math.max(...rights) - Math.min(...xs) + PAD * 2 + RIGHT_EXTRA,
		height:
			Math.max(...bottoms) - Math.min(...ys) + PAD * 2 + SINGLE_HEIGHT_BONUS,
	};
}
