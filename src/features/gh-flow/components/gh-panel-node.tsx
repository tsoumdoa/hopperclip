import type { GHNodeProps } from "../types";
import { GHHandle } from "./handle";
import { HandlePosition } from "./handle-position";

export function GHPanelNode({ data }: GHNodeProps) {
	const inputs = data.inputs ?? [];
	const outputs = data.outputs ?? [];
	const bounded = data.usesGrasshopperBounds === true;
	const hasHeading = data.label.trim() !== "" && data.label !== "Panel";
	const headingHeight = bounded ? Math.min(16, (data.height ?? 32) / 2) : 16;
	const handleTop =
		bounded && hasHeading && data.height
			? `${(headingHeight / data.height) * 100}%`
			: "50%";

	return (
		<div
			className={`relative overflow-visible ${bounded ? "h-full w-full" : ""}`}
		>
			<div
				className={`relative flex flex-col overflow-hidden rounded-sm border border-[#444] font-sans text-[10px] shadow-sm select-none ${bounded ? "h-full w-full min-w-0" : ""}`}
				style={{
					minWidth: bounded ? undefined : 60,
					height: bounded ? "100%" : (data.height ?? 28),
					backgroundColor: "#fff",
				}}
			>
				{hasHeading && (
					<div
						className="flex w-full shrink-0 items-center justify-center overflow-hidden border-b border-[#444] bg-[#e8e8e8] px-2 font-sans font-medium text-ellipsis whitespace-nowrap text-[#222]"
						style={{ height: headingHeight }}
						title={data.label}
					>
						{data.label}
					</div>
				)}
				{data.value !== undefined && data.value !== "" && (
					<div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
						<span className="min-w-0 overflow-hidden px-2 text-center font-mono text-[10px] text-ellipsis whitespace-nowrap text-[#444]">
							{data.value}
						</span>
					</div>
				)}
			</div>

			<HandlePosition position="left" top={handleTop}>
				<GHHandle
					variant="detailed"
					position="left"
					type="target"
					id={inputs[0]?.id}
				/>
			</HandlePosition>

			<HandlePosition position="right" top={handleTop}>
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
