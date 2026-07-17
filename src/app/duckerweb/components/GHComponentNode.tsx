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

function getPortTop(index: number, count: number) {
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
	const palette = runtimePalette(
		data.runtimeState ?? "normal",
		data.accentColor
	);

	return (
		<div className="relative overflow-visible">
			<div
				className={`relative flex overflow-hidden rounded-sm border font-sans text-[10px] shadow-md select-none ${
					selected ? "border-[#444]" : "border-[#444]"
				}`}
			>
				<div
					className="flex flex-col justify-around border-r border-[#444] px-2 py-2"
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
					className="flex items-center justify-center px-2 py-2"
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
					className="flex flex-col justify-around border-l border-[#444] px-2 py-2"
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
						top: getPortTop(index, inputs.length),
						width: inputWidth,
						transform: "translateY(-50%)",
					}}
				>
					<GHHandle
						variant="detailed"
						position="left"
						type="target"
						id={input.id}
					/>

					<div className="ml-1 min-w-0 text-[10px]">
						<PortLabel
							port={input}
							align="left"
							style={{ color: palette.text }}
						/>
					</div>
				</div>
			))}

			{outputs.map((output, index) => (
				<div
					key={output.id}
					className="pointer-events-none absolute right-0 flex items-center justify-end text-center"
					style={{
						top: getPortTop(index, outputs.length),
						width: outputWidth,
						transform: "translateY(-50%)",
					}}
				>
					<div className="mr-1 min-w-0 text-[10px]">
						<PortLabel
							port={output}
							align="right"
							style={{ color: palette.text }}
						/>
					</div>

					<GHHandle
						variant="detailed"
						position="right"
						type="source"
						id={output.id}
					/>
				</div>
			))}
		</div>
	);
}
