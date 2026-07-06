import type { Component } from "parser/src/types";
import { POSITION_SCALE_X } from "../components/constants";

export type NodePosition = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function buildNodePositions(
	components: Record<string, Component>
): Map<string, NodePosition> {
	const nodePositions = new Map<string, NodePosition>();

	for (const comp of Object.values(components)) {
		if (comp.type === "Group") continue;
		const b = comp.visuals?.bounds;
		if (b) {
			nodePositions.set(comp.id, {
				x: b.x * POSITION_SCALE_X,
				y: b.y,
				width: b.width * POSITION_SCALE_X,
				height: b.height,
			});
		} else {
			nodePositions.set(comp.id, {
				x: Math.random() * 400,
				y: Math.random() * 300,
				width: 100,
				height: 40,
			});
		}
	}

	return nodePositions;
}
