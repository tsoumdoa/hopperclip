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
	data,
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
	const wireStyle = data?.wireStyle ?? "normal";
	const isHidden = wireStyle === "hidden";
	const isVisible = !isHidden || data?.isRevealed;

	return (
		<BaseEdge
			path={edgePath}
			style={{
				stroke: "#555552",
				strokeWidth: 1.5,
				opacity: isVisible
					? wireStyle === "faint"
						? 0.28
						: isHidden
							? 0.32
							: 1
					: 0,
				strokeDasharray: isHidden ? "4 4" : undefined,
				pointerEvents: isVisible ? "auto" : "none",
				transition: "opacity 160ms ease",
				...style,
				...(selected && { stroke: "#00a0ff", strokeWidth: 2, opacity: 1 }),
			}}
		/>
	);
}
