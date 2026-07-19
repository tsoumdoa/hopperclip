import type { GHNodeProps, Port } from "../types/type";
import { HANDLE_SIZE } from "./constants";
import { GHHandle } from "./Handle";
import { runtimePalette } from "../lib/runtime-palette";
import { getPortContentWidth, PortLabel } from "./PortOptions";
const SIDE_PADDING_X = 8;
const LABEL_GAP = 4;
const APPROX_CHAR_WIDTH = 5.5;
const MIN_SIDE_WIDTH = 24;

function getComputedSideWidth(ports: Port[], manualWidth?: number) {
	if (manualWidth !== undefined) {
		return manualWidth;
	}

	const widestPortContent = ports.reduce(
		(max, port) => Math.max(max, getPortContentWidth(port, APPROX_CHAR_WIDTH)),
		0
	);

	return Math.max(
		MIN_SIDE_WIDTH,
		SIDE_PADDING_X * 2 + HANDLE_SIZE / 2 + LABEL_GAP + widestPortContent
	);
}

function getPortTop(port: Port, index: number, count: number) {
	if (port.position !== undefined) {
		return `${port.position * 100}%`;
	}
	if (count <= 0) {
		return "50%";
	}

	return `${((index + 1) / (count + 1)) * 100}%`;
}

export function GHComponentNode({ data, selected }: GHNodeProps) {
	const inputs = data.inputs ?? [];
	const outputs = data.outputs ?? [];

	const inputWidth = getComputedSideWidth(inputs, data.inputWidth);
	const outputWidth = getComputedSideWidth(outputs, data.outputWidth);
	const usesGrasshopperBounds =
		data.inputWidth !== undefined && data.outputWidth !== undefined;
	const palette = runtimePalette(
		data.runtimeState ?? "normal",
		data.accentColor
	);

	return (
		<div className="relative h-full w-full overflow-visible">
			<div
				className={`relative flex h-full w-full overflow-hidden rounded-sm border font-sans text-[10px] shadow-md select-none ${
					selected ? "border-[#444]" : "border-[#444]"
				}`}
			>
				<div
					className={`flex shrink-0 flex-col justify-around border-r border-[#444] ${usesGrasshopperBounds ? "p-0" : "px-2 py-2"}`}
					style={{ width: inputWidth, backgroundColor: palette.side }}
				>
					{inputs.map((input) => (
						<div
							key={input.id}
							className="relative mx-1 flex h-5 min-w-0 items-center justify-end"
						/>
					))}
				</div>

				<div
					className={`flex min-w-0 flex-1 items-center justify-center ${usesGrasshopperBounds ? "p-0" : "px-2 py-2"}`}
					style={{ backgroundColor: palette.center }}
				>
					<span
						className="text-[11px] font-bold tracking-tight text-white"
						style={{
							writingMode: "vertical-lr",
							transform: "rotate(180deg)",
						}}
					>
						{data.label}
					</span>
				</div>

				<div
					className={`flex shrink-0 flex-col justify-around border-l border-[#444] ${usesGrasshopperBounds ? "p-0" : "px-2 py-2"}`}
					style={{ width: outputWidth, backgroundColor: palette.side }}
				>
					{outputs.map((output) => (
						<div
							key={output.id}
							className="relative mx-2 flex h-5 min-w-0 items-center justify-start"
						/>
					))}
				</div>
			</div>

			{inputs.map((input, index) => (
				<div
					key={input.id}
					className="pointer-events-none absolute left-0 flex items-center"
					style={{
						top: getPortTop(input, index, inputs.length),
						width: inputWidth,
						transform: "translateY(-50%)",
					}}
				>
					<GHHandle
						variant="detailed"
						position="left"
						type="target"
						id={input.id}
						detached={usesGrasshopperBounds}
					/>

					<div
						className={`${usesGrasshopperBounds ? "shrink-0 overflow-hidden" : "ml-1 min-w-0 flex-1 pr-2"} text-[10px]`}
						style={
							usesGrasshopperBounds
								? {
										marginLeft: input.labelOffset ?? 0,
										width: input.labelWidth ?? inputWidth,
									}
								: undefined
						}
					>
						<PortLabel
							port={input}
							align={usesGrasshopperBounds ? "center" : "right"}
							style={{ color: palette.text }}
						/>
					</div>
				</div>
			))}

			{outputs.map((output, index) => (
				<div
					key={output.id}
					className={`pointer-events-none absolute right-0 flex items-center text-center ${usesGrasshopperBounds ? "justify-start" : "justify-end"}`}
					style={{
						top: getPortTop(output, index, outputs.length),
						width: outputWidth,
						transform: "translateY(-50%)",
					}}
				>
					<div
						className={`${usesGrasshopperBounds ? "shrink-0 overflow-hidden" : "mr-1 min-w-0"} text-[10px]`}
						style={
							usesGrasshopperBounds
								? {
										marginLeft: output.labelOffset ?? 0,
										width: output.labelWidth ?? outputWidth,
									}
								: undefined
						}
					>
						<PortLabel
							port={output}
							align={usesGrasshopperBounds ? "center" : "right"}
							style={{ color: palette.text }}
						/>
					</div>

					<GHHandle
						variant="detailed"
						position="right"
						type="source"
						id={output.id}
						detached={usesGrasshopperBounds}
					/>
				</div>
			))}
		</div>
	);
}
