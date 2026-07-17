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
	style,
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
				stroke: "#555552",
				strokeWidth: 1.5,
				...style,
				...(selected && { stroke: "#00a0ff", strokeWidth: 2, opacity: 1 }),
			}}
		/>
	);
}
