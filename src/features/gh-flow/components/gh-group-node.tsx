import type { GHGroupNodeProps } from "../types";
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
				<div
					className="pointer-events-none absolute bottom-[calc(100%+5px)] left-1/2 z-20 -translate-x-1/2"
					title={data.label}
				>
					<div className="relative border border-[#292929] bg-[#f4f4f4] px-2 py-1 font-sans text-[9px] leading-none font-normal whitespace-nowrap text-[#1f1f1f] shadow-sm">
						{data.label}
						<span
							aria-hidden="true"
							className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-[#292929]"
						/>
						<span
							aria-hidden="true"
							className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 -translate-y-px border-x-[5px] border-t-[7px] border-x-transparent border-t-[#f4f4f4]"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
