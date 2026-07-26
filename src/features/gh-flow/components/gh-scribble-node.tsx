import type { CSSProperties } from "react";
import type { GHScribbleNodeProps } from "../types/type";

export function GHScribbleNode({ data }: GHScribbleNodeProps) {
	const scribble = data.scribble;
	const bounds = scribble?.componentBounds;
	const corners = scribble?.corners;
	const textBounds =
		bounds && corners
			? {
					left: corners.a.x - bounds.x,
					top: corners.a.y - bounds.y,
					width: corners.b.x - corners.a.x,
					height: corners.d.y - corners.a.y,
				}
			: { left: 5, top: 5, width: "calc(100% - 10px)", height: "auto" };
	const textStyle: CSSProperties = {
		position: "absolute",
		...textBounds,
		fontFamily: scribble?.font ?? "Arial",
		fontSize: scribble?.size ?? 12,
		fontWeight: scribble?.bold ? 700 : 400,
		fontStyle: scribble?.italic ? "italic" : "normal",
		lineHeight:
			typeof textBounds.height === "number"
				? `${textBounds.height}px`
				: "normal",
	};

	return (
		<div className="pointer-events-none relative h-full w-full overflow-visible select-none">
			<div
				className="overflow-visible whitespace-pre text-[#1f1f1f]"
				style={textStyle}
			>
				{data.value}
			</div>
		</div>
	);
}
