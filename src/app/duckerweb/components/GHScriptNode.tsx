import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Check, Code2, Copy } from "lucide-react";
import type { GHNodeProps, Port, ScriptData } from "../types/type";
import { HANDLE_SIZE } from "./constants";
import { GHHandle } from "./Handle";
import { runtimePalette } from "../lib/runtime-palette";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

const languageLoaders: Record<string, () => Promise<{ default: unknown }>> = {
	csharp: () => import("shiki/dist/langs/csharp.mjs"),
	python: () => import("shiki/dist/langs/python.mjs"),
	vb: () => import("shiki/dist/langs/vb.mjs"),
};

function ScriptCodeViewer({ script }: { script: ScriptData }) {
	const [html, setHtml] = useState<string | null>(null);

	const langMap: Record<string, string> = {
		csharp: "csharp",
		python: "python",
		vb: "vb",
		vbnet: "vb",
	};

	const lang = script.language
		? (langMap[script.language.toLowerCase()] ?? script.language.toLowerCase())
		: "text";

	useEffect(() => {
		let cancelled = false;
		setHtml(null);

		void (async () => {
			try {
				const { createHighlighter } = await import("shiki/bundle/web");
				const highlighter = await createHighlighter({
					themes: ["catppuccin-mocha"],
					langs: [],
				});

				let safeLang = "text";

				const loader = languageLoaders[lang];
				if (loader) {
					try {
						const mod = await loader();
						await highlighter.loadLanguage(
							mod.default as Parameters<typeof highlighter.loadLanguage>[0]
						);
						safeLang = lang;
					} catch {
						// fallback to plain text if lang not available
					}
				}

				const rendered = highlighter.codeToHtml(script.code, {
					lang: safeLang,
					theme: "catppuccin-mocha",
				});

				if (!cancelled) {
					setHtml(DOMPurify.sanitize(rendered));
				}
			} catch {
				if (!cancelled) {
					const escaped = script.code
						.replaceAll("&", "&amp;")
						.replaceAll("<", "&lt;")
						.replaceAll(">", "&gt;")
						.replaceAll('"', "&quot;")
						.replaceAll("'", "&#39;");
					setHtml(DOMPurify.sanitize(`<pre>${escaped}</pre>`));
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [lang, script.code]);

	return (
		<div className="max-h-[70vh] max-w-full overflow-auto rounded-lg border border-neutral-800 bg-[#1e1e2e] p-4">
			{html ? (
				<div
					className="shiki min-w-max text-xs leading-relaxed"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className="font-mono text-xs text-neutral-500">
					Loading syntax highlighter...
				</pre>
			)}
		</div>
	);
}

export function GHScriptNode({ data, selected }: GHNodeProps) {
	const inputs = data.inputs ?? [];
	const outputs = data.outputs ?? [];
	const [dialogOpen, setDialogOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const inputWidth = getComputedSideWidth(inputs, data.inputWidth);
	const outputWidth = getComputedSideWidth(outputs, data.outputWidth);
	const bounded = data.usesGrasshopperBounds === true;
	const palette = runtimePalette(
		data.runtimeState ?? "normal",
		data.accentColor
	);

	return (
		<>
			<div
				className={`relative overflow-visible ${bounded ? "h-full w-full" : ""}`}
			>
				<div
					className={`relative flex overflow-hidden rounded-sm border font-sans text-[10px] shadow-md select-none ${bounded ? "h-full w-full" : ""} ${
						selected ? "border-[#444]" : "border-[#444]"
					}`}
				>
					<div
						className={`flex shrink-0 flex-col justify-around border-r border-[#444] ${bounded ? "p-0" : "px-2 py-2"}`}
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
						className={`flex min-w-0 flex-1 items-center justify-center ${bounded ? "p-0" : "px-2 py-2"}`}
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
						className={`flex shrink-0 flex-col justify-around border-l border-[#444] ${bounded ? "p-0" : "px-2 py-2"}`}
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

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setDialogOpen(true);
					}}
					className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-400 bg-neutral-700 text-neutral-200 shadow-sm transition-colors hover:bg-neutral-600 hover:text-white"
					title="View script code"
				>
					<Code2 className="h-3 w-3" />
				</button>

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
							detached={bounded}
						/>

						<div
							className={`${bounded ? "shrink-0 overflow-hidden" : "ml-1 min-w-0 flex-1 pr-2"} text-[10px]`}
							style={
								bounded
									? {
											marginLeft: input.labelOffset ?? 0,
											width: input.labelWidth ?? inputWidth,
										}
									: undefined
							}
						>
							<PortLabel
								port={input}
								align={bounded ? "center" : "right"}
								style={{ color: palette.text }}
								runtimeState={data.runtimeState ?? "normal"}
							/>
						</div>
					</div>
				))}

				{outputs.map((output, index) => (
					<div
						key={output.id}
						className={`pointer-events-none absolute right-0 flex items-center text-center ${bounded ? "justify-start" : "justify-end"}`}
						style={{
							top: getPortTop(output, index, outputs.length),
							width: outputWidth,
							transform: "translateY(-50%)",
						}}
					>
						<div
							className={`${bounded ? "shrink-0 overflow-hidden" : "mr-1 min-w-0"} text-[10px]`}
							style={
								bounded
									? {
											marginLeft: output.labelOffset ?? 0,
											width: output.labelWidth ?? outputWidth,
										}
									: undefined
							}
						>
							<PortLabel
								port={output}
								align={bounded ? "center" : "right"}
								style={{ color: palette.text }}
								runtimeState={data.runtimeState ?? "normal"}
							/>
						</div>

						<GHHandle
							variant="detailed"
							position="right"
							type="source"
							id={output.id}
							detached={bounded}
						/>
					</div>
				))}
			</div>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="w-[90vw] max-w-3xl gap-0 overflow-hidden p-0">
					<DialogHeader className="p-4 pb-0">
						<DialogTitle className="text-sm font-medium">
							{data.script?.title ?? data.label}
							<span className="ml-2 font-normal text-neutral-500">
								— Script
							</span>
						</DialogTitle>
					</DialogHeader>
					<div className="relative min-w-0 p-4 pt-2">
						{data.script && (
							<>
								<button
									type="button"
									onClick={() => {
										navigator.clipboard.writeText(data.script!.code);
										setCopied(true);
										setTimeout(() => setCopied(false), 1500);
									}}
									aria-label={copied ? "Copied" : "Copy code"}
									className="absolute top-4 right-6 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
								>
									{copied ? (
										<Check className="h-4 w-4" strokeWidth={2.5} />
									) : (
										<Copy className="h-3.5 w-3.5" strokeWidth={2} />
									)}
								</button>
								<div className="min-w-0 overflow-x-auto">
									<ScriptCodeViewer script={data.script} />
								</div>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
