import type { GHGroupNodeProps } from "../types/type";
import { grasshopperArgbToCss } from "../lib/grasshopper-color";

export function GHGroupNode({ data }: GHGroupNodeProps) {
	const bounds = data.containerBounds;

	if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
		return (
			<div className="rounded-md px-3 py-2" style={{ width: 120, height: 60 }}>
				<span className="text-[9px] font-medium text-[#555]">{data.label}</span>
			</div>
		);
	}

	return (
		<div
			className="relative h-full w-full rounded-lg"
			style={{
				zIndex: 1,
				backgroundColor: grasshopperArgbToCss(data.groupColor, "transparent"),
			}}
		>
			{data.label !== "Group" && (
				<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-semibold whitespace-nowrap text-neutral-800">
					{data.label}
				</span>
			)}
		</div>
	);
}
