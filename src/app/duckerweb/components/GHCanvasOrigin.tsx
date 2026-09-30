import { useStore, useViewport } from "@xyflow/react";

export function GHCanvasOrigin() {
	const { x, y } = useViewport();
	const width = useStore((state) => state.width);
	const height = useStore((state) => state.height);

	// Flow coordinate (0, 0) projects to the viewport translation. Draw only
	// the positive axes, with a constant screen-space weight at every zoom.
	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0"
			width="100%"
			height="100%"
			data-canvas-origin
		>
			<g stroke="#89857c" strokeWidth={2.5}>
				{x < width && y >= 0 && y <= height && (
					<line x1={Math.max(0, x)} y1={y} x2={width} y2={y} />
				)}
				{y < height && x >= 0 && x <= width && (
					<line x1={x} y1={Math.max(0, y)} x2={x} y2={height} />
				)}
			</g>
		</svg>
	);
}
