import type { GHToggleNodeProps } from "../types/type";
import { GHHandle } from "./Handle";

export function GHToggleNode({ data, selected }: GHToggleNodeProps) {
	const bounded = data.usesGrasshopperBounds === true;
	return (
		<div
			className={`flex items-center overflow-hidden rounded-sm border border-none bg-[#c8c5be] font-sans text-[10px] shadow-sm select-none ${bounded ? "h-full w-full min-w-0" : "h-7"}`}
			style={{ minWidth: bounded ? undefined : 80 }}
		>
			<div className="flex h-full max-w-[55%] shrink-0 items-center overflow-hidden border-r border-[#aaa] bg-[#b0ada6] px-2 font-medium text-ellipsis whitespace-nowrap text-[#222]">
				{data.label ?? "Toggle"}
			</div>

			<div className="flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#444] px-3">
				<span className="overflow-hidden font-mono text-[11px] text-ellipsis whitespace-nowrap text-[#ddd]">
					{data.value ?? "False"}
				</span>
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
