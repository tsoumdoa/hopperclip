import { BaseEdge, getBezierPath } from "@xyflow/react";
import type { GHEdgeProps } from "../types/type";

export function GHEdge({
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	selected,
}: GHEdgeProps) {
	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
		curvature: 0.35,
	});

	return (
		<BaseEdge
			path={edgePath}
			style={{
				stroke: selected ? "#00a0ff" : "#555552",
				strokeWidth: selected ? 2 : 1.5,
			}}
		/>
	);
}
