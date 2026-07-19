import type { GHSwatchNodeProps } from "../types/type";
import { GHHandle } from "./Handle";

function semicolonRgbaToCss(input: string): string {
	const parts = input.split(";").map(Number);

	if (parts.length < 3 || parts.some(Number.isNaN)) {
		return "#ddd";
	}

	const [a = 255, r, g, b] = parts;
	const alpha = Math.max(0, Math.min(255, a)) / 255;

	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GHSwatchNode({ data }: GHSwatchNodeProps) {
	const bg = data.color ? semicolonRgbaToCss(data.color) : "#ddd";
	return (
		<div className="relative overflow-visible">
			<div className="flex h-7 w-max items-center overflow-hidden rounded-sm border border-[#444] font-sans text-[10px] shadow-md select-none">
				<div className="flex h-full min-w-11 items-center border-r border-[#444] bg-[#b0ada6] px-2 font-medium whitespace-nowrap text-[#222]">
					{data.label ?? "Swatch"}
				</div>
				<div
					aria-hidden
					className="h-full w-14 shrink-0"
					style={{ backgroundColor: bg }}
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
