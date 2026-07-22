import type { GHNodeProps } from "../types/type";
import { runtimePalette } from "../lib/runtime-palette";
import { GHHandle } from "./Handle";
import { HandlePosition } from "./HandlePosition";
import { PortLabel } from "./PortOptions";

export function GHRelayNode({ data, selected }: GHNodeProps) {
	const output = data.outputs[0];
	const bounded = data.usesGrasshopperBounds === true;
	const palette = runtimePalette(data.runtimeState ?? "normal");

	return (
		<div
			className={`relative overflow-visible ${bounded ? "h-full w-full" : ""}`}
		>
			<div
				className={`relative flex items-center justify-center overflow-hidden rounded-sm border font-sans text-[10px] shadow-md select-none ${bounded ? "h-full w-full min-w-0" : ""} ${
					selected ? "border-[#444]" : "border-[#444]"
				}`}
				style={{ backgroundColor: palette.side }}
			>
				<div
					className="min-w-0 overflow-hidden px-2 py-1.5 text-center text-[11px] font-bold tracking-tight text-ellipsis whitespace-nowrap"
					style={{ color: palette.text }}
				>
					{output ? (
						<PortLabel
							port={{ ...output, label: data.label }}
							align="center"
							runtimeState={data.runtimeState ?? "normal"}
						/>
					) : (
						data.label
					)}
				</div>
			</div>

			<HandlePosition position="left">
				<GHHandle
					variant="detailed"
					position="left"
					type="target"
					id={data.inputs[0]?.id}
				/>
			</HandlePosition>

			<HandlePosition position="right">
				<GHHandle
					variant="detailed"
					position="right"
					type="source"
					id={data.outputs[0]?.id}
				/>
			</HandlePosition>
		</div>
	);
}
