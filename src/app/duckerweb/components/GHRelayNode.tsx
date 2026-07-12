import type { GHNodeProps } from "../types/type";
import { GHHandle } from "./Handle";
import { HandlePosition } from "./HandlePosition";

export function GHRelayNode({ data, selected }: GHNodeProps) {
	return (
		<div className="relative overflow-visible">
			<div
				className={`relative flex items-center overflow-hidden rounded-sm border font-sans text-[10px] shadow-md select-none ${
					selected ? "border-[#444]" : "border-[#444]"
				}`}
				style={{ backgroundColor: "#E8E8E8" }}
			>
				<span className="px-2 py-1.5 text-[11px] font-bold tracking-tight whitespace-nowrap text-[#222]">
					{data.label}
				</span>
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
