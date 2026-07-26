import type { GHSwatchNodeProps } from "../types";
import { grasshopperArgbToCss } from "../lib/grasshopper-color";
import { GHHandle } from "./handle";

export function GHSwatchNode({ data }: GHSwatchNodeProps) {
	const bg = grasshopperArgbToCss(data.color, "#ddd");
	const bounded = data.usesGrasshopperBounds === true;
	return (
		<div
			className={`relative overflow-visible ${bounded ? "h-full w-full" : ""}`}
		>
			<div
				className={`flex items-center overflow-hidden rounded-sm border border-[#444] font-sans text-[10px] shadow-md select-none ${bounded ? "h-full w-full min-w-0" : "h-7 w-max"}`}
			>
				<div
					className={`flex h-full min-w-0 items-center overflow-hidden border-r border-[#444] bg-[#b0ada6] px-2 font-medium text-ellipsis whitespace-nowrap text-[#222] ${bounded ? "flex-1" : "min-w-11"}`}
				>
					{data.label ?? "Swatch"}
				</div>
				<div
					aria-hidden
					className={`h-full shrink-0 ${bounded ? "" : "w-14"}`}
					style={{
						backgroundColor: bg,
						width: bounded ? (data.outputWidth ?? "25%") : undefined,
					}}
				/>
			</div>

			<GHHandle
				variant="compact"
				position="right"
				type="source"
				id={data.outputs[0]?.id}
				className="!right-[-0px]"
			/>
		</div>
	);
}
