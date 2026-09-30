import { useStore, useViewport } from "@xyflow/react";

export function GHCanvasOrigin() {
	const { x, y } = useViewport();
	const width = useStore((state) => state.width);
	const height = useStore((state) => state.height);

	// Flow (0, 0) projects to the viewport translation. SVG clipping handles
	// offscreen portions; stop at the origin if it is past the right/bottom edge.
	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
			width="100%"
			height="100%"
			data-canvas-origin
			stroke="#89857c"
			strokeWidth={2.5}
		>
			{x < width && <line x1={x} y1={y} x2={width} y2={y} />}
			{y < height && <line x1={x} y1={y} x2={x} y2={height} />}
		</svg>
	);
}
