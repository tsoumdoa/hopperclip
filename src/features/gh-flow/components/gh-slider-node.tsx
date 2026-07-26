import type { GHSliderNodeProps } from "../types";
import { GHHandle } from "./handle";

export function GHSliderNode({ data }: GHSliderNodeProps) {
	const percent = data.percent ?? 50;
	const bounded = data.usesGrasshopperBounds === true;

	return (
		<div
			className={`flex items-center overflow-hidden rounded-sm border border-[#444] bg-[#c8c5be] font-sans text-[10px] shadow-sm select-none ${bounded ? "h-full w-full min-w-0" : "h-7"}`}
			style={{ minWidth: bounded ? undefined : 200 }}
		>
			<div className="flex h-full max-w-[45%] shrink-0 items-center overflow-hidden border-r border-[#444] bg-[#b0ada6] px-2 py-2 font-medium text-ellipsis whitespace-nowrap text-[#222]">
				{data.label ?? "Slider"}
			</div>

			<div className="flex h-full min-w-0 flex-1 items-center gap-1 bg-[#d8d5ce] px-2 py-2">
				<div className="relative h-[2px] flex-1 bg-[#aaa]">
					<div
						className="absolute top-1/2 h-4 w-2 -translate-y-1/2 cursor-ew-resize border border-[#666] bg-[#888]"
						style={{ left: `${percent}%` }}
					/>
				</div>
				<span className="shrink-0 font-mono text-[10px] text-[#333]">
					{data.value ?? "0"}
				</span>
				<span className="text-[8px] text-[#666]">◆</span>
			</div>

			<GHHandle
				variant="compact"
				position="right"
				type="source"
				id={data.outputs[0]?.id}
			/>
		</div>
	);
}
