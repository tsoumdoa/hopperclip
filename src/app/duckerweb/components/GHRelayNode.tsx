import type { GHNodeProps } from "../types/type";
import { GHHandle } from "./Handle";
import { HandlePosition } from "./HandlePosition";
import { PortLabel } from "./PortOptions";

export function GHRelayNode({ data, selected }: GHNodeProps) {
	const output = data.outputs[0];

	return (
		<div className="relative overflow-visible">
			<div
				className={`relative flex items-center overflow-hidden rounded-sm border font-sans text-[10px] shadow-md select-none ${
					selected ? "border-[#444]" : "border-[#444]"
				}`}
				style={{ backgroundColor: "#E8E8E8" }}
			>
				<div className="px-2 py-1.5 text-[11px] font-bold tracking-tight text-[#222]">
					{output ? (
						<PortLabel port={{ ...output, label: data.label }} align="left" />
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
