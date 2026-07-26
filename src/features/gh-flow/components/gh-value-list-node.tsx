import type { GHValueListNodeProps } from "../types/type";
import { GHHandle } from "./Handle";
import { HandlePosition } from "./HandlePosition";

export function GHValueListNode({ data, selected }: GHValueListNodeProps) {
	const outputs = data.outputs ?? [];
	const bounded = data.usesGrasshopperBounds === true;

	return (
		<div
			className={`relative overflow-visible ${bounded ? "h-full w-full" : ""}`}
		>
			<div
				className={`relative flex items-center overflow-hidden rounded-sm border font-sans text-[10px] shadow-sm select-none ${bounded ? "h-full w-full min-w-0" : ""} ${selected ? "border-[#444]" : "border-[#444]"}`}
				style={{
					minWidth: bounded ? undefined : 100,
					height: bounded ? "100%" : data.value ? 28 : 24,
					backgroundColor: "#fff",
				}}
			>
				<div className="flex max-w-[55%] min-w-0 shrink-0 items-center overflow-hidden border-r border-[#ddd] bg-[#f5f5f0] px-2 font-medium text-ellipsis whitespace-nowrap text-[#444]">
					{data.label}
				</div>

				<div className="flex min-w-0 flex-1 items-center justify-between px-2">
					<span className="min-w-0 overflow-hidden font-mono text-[10px] text-ellipsis whitespace-nowrap text-[#333]">
						{data.value ?? ""}
					</span>
					<span className="text-[8px] text-[#999]">▾</span>
				</div>
			</div>

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
