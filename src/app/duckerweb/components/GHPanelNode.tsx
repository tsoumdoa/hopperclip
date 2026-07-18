import type { GHNodeProps } from "../types/type";
import { resolveInspectableExpression } from "../lib/component-expression";
import { ExpressionInspector } from "./ExpressionInspector";
import { GHHandle } from "./Handle";
import { HandlePosition } from "./HandlePosition";

export function GHPanelNode({ data, selected }: GHNodeProps) {
	const inputs = data.inputs ?? [];
	const outputs = data.outputs ?? [];
	const componentExpression = resolveInspectableExpression(data);

	return (
		<div className="relative overflow-visible">
			<div
				className={`relative flex items-center overflow-hidden rounded-sm border font-sans text-[10px] shadow-sm select-none ${selected ? "border-[#444]" : "border-[#b0aa40]"}`}
				style={{
					minWidth: 60,
					height: data.height ?? 28,
					backgroundColor: "#fff",
				}}
			>
				{componentExpression && (
					<div className="pointer-events-auto flex items-center pl-1.5">
						<ExpressionInspector expression={componentExpression} />
					</div>
				)}
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
