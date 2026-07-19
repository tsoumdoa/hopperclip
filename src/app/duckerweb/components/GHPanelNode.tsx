import type { GHNodeProps } from "../types/type";
import { GHHandle } from "./Handle";
import { HandlePosition } from "./HandlePosition";

export function GHPanelNode({ data }: GHNodeProps) {
	const inputs = data.inputs ?? [];
	const outputs = data.outputs ?? [];

	return (
		<div className="relative overflow-visible">
			<div
				className="relative flex items-center overflow-hidden rounded-sm border border-[#444] font-sans text-[10px] shadow-sm select-none"
				style={{
					minWidth: 60,
					height: data.height ?? 28,
					backgroundColor: "#fff",
				}}
			>
				{data.value !== undefined && data.value !== "" && (
					<span className="px-2 font-mono text-[10px] text-[#444]">
						{data.value}
					</span>
				)}
			</div>

			<HandlePosition position="left">
				<GHHandle
					variant="detailed"
					position="left"
					type="target"
					id={inputs[0]?.id}
				/>
			</HandlePosition>

			<HandlePosition position="right">
				<GHHandle
					variant="detailed"
					position="right"
					type="source"
					id={outputs[0]?.id}
				/>
			</HandlePosition>
		</div>
	);
}
