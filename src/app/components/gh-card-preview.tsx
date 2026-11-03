import {
	ArrowRight,
	Code2,
	List,
	Puzzle,
	SlidersHorizontal,
	ToggleLeft,
} from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import {
	PREVIEW_CAPS,
	PREVIEW_KINDS,
	type PreviewData,
	type PreviewKind,
	type PreviewSignature,
} from "@/types/preview";

type RenderDigest = Omit<PreviewData, "nodes" | "edges"> & {
	nodes: Array<{
		x: number;
		y: number;
		w: number;
		h: number;
		kind: PreviewKind;
	}>;
	edges: Array<[number, number]>;
};

function renderDigest(data: PreviewData): RenderDigest {
	const nodes: RenderDigest["nodes"] = [];
	const edges: RenderDigest["edges"] = [];
	for (let i = 0; i < data.nodes.length; i += 5) {
		const [x, y, w, h, kind] = data.nodes.slice(i, i + 5);
		nodes.push({ x, y, w, h, kind: PREVIEW_KINDS[kind] });
	}
	for (let i = 0; i < data.edges.length; i += 2)
		edges.push([data.edges[i], data.edges[i + 1]]);
	return { ...data, nodes, edges };
}

const KIND_STYLE: Record<PreviewKind, { fill: string; opacity: number }> = {
	component: { fill: "#737373", opacity: 0.75 },
	param: { fill: "#a3a3a3", opacity: 0.45 },
	input: { fill: "#86efac", opacity: 0.75 },
	script: { fill: "#e5e5e5", opacity: 0.85 },
	panel: { fill: "#fde68a", opacity: 0.55 },
	plugin: { fill: "#c4b5fd", opacity: 0.75 },
};

function Silhouette(props: {
	digest: RenderDigest;
	className?: string;
	dense?: boolean;
}) {
	const { nodes, edges, groups, count } = props.digest;
	const xs = [...nodes.map((n) => n.x), ...groups.map((g) => g.x)];
	const ys = [...nodes.map((n) => n.y), ...groups.map((g) => g.y)];
	const x2 = [...nodes.map((n) => n.x + n.w), ...groups.map((g) => g.x + g.w)];
	const y2 = [...nodes.map((n) => n.y + n.h), ...groups.map((g) => g.y + g.h)];
	const pad = 40;
	const minX = (xs.length ? Math.min(...xs) : 0) - pad;
	const minY = (ys.length ? Math.min(...ys) : 0) - pad;
	const w = (x2.length ? Math.max(...x2) : 0) - minX + pad;
	const h = (y2.length ? Math.max(...y2) : 0) - minY + pad;
	// Big definitions turn into texture; fade wires so blocks stay legible.
	const wireOpacity = count > 60 ? 0.08 : count > 20 ? 0.16 : 0.24;

	return (
		<svg
			viewBox={`${minX} ${minY} ${w} ${h}`}
			preserveAspectRatio="xMidYMid meet"
			className={cn("h-full w-full", props.className)}
			aria-hidden
		>
			{groups.map((g, i) => (
				<rect
					key={`g${i}`}
					x={g.x}
					y={g.y}
					width={g.w}
					height={g.h}
					rx={8}
					fill={g.color}
					fillOpacity={0.06}
					stroke={g.color}
					strokeOpacity={0.22}
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
				/>
			))}
			{edges.map(([a, b], i) => {
				const s = nodes[a];
				const t = nodes[b];
				const sx = s.x + s.w;
				const sy = s.y + s.h / 2;
				const tx = t.x;
				const ty = t.y + t.h / 2;
				const dx = Math.max(40, (tx - sx) / 2);
				return (
					<path
						key={`e${i}`}
						d={`M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`}
						fill="none"
						stroke="#fff"
						strokeOpacity={wireOpacity}
						strokeWidth={1}
						vectorEffect="non-scaling-stroke"
					/>
				);
			})}
			{nodes.map((n, i) => {
				const style = KIND_STYLE[n.kind];
				return (
					<rect
						key={`n${i}`}
						x={n.x}
						y={n.y}
						width={n.w}
						height={n.h}
						rx={props.dense ? 3 : 6}
						fill={style.fill}
						fillOpacity={style.opacity}
					/>
				);
			})}
		</svg>
	);
}

const canvasBg =
	"bg-black/30 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:10px_10px]";

function PreviewBand(props: {
	missing?: boolean;
	className: string;
	children?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"relative -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl border-b border-white/[0.06]",
				canvasBg,
				props.className
			)}
		>
			{props.missing ? (
				<div className="flex h-full items-center justify-center text-[11px] text-neutral-600">
					Preview appears after you open this card
				</div>
			) : (
				props.children
			)}
		</div>
	);
}

function Chip(props: {
	icon: React.ReactNode;
	names: string[];
	count: number;
	tone?: "default" | "script" | "plugin";
}) {
	return (
		<span
			title={`${props.names.join(", ")}${props.count > props.names.length ? ` +${props.count - props.names.length} more` : ""}`}
			className={cn(
				"inline-flex h-5 max-w-full min-w-0 items-center gap-1 rounded px-1.5 font-mono text-[10.5px]",
				props.tone === "plugin"
					? "bg-violet-300/10 text-violet-200/90"
					: props.tone === "script"
						? "bg-white/10 text-neutral-200"
						: "bg-white/[0.04] text-neutral-400"
			)}
		>
			{props.icon}
			<span className="min-w-0 truncate">{props.names[0]}</span>
			{props.count > 1 && <span className="shrink-0">+{props.count - 1}</span>}
		</span>
	);
}

function CompositionBar(props: { digest: RenderDigest }) {
	const order: PreviewKind[] = [
		"input",
		"param",
		"component",
		"script",
		"plugin",
		"panel",
	];
	const counts = order.map(
		(k) => props.digest.nodes.filter((n) => n.kind === k).length
	);
	const total = counts.reduce((a, b) => a + b, 0);
	return (
		<div className="flex h-1 w-full gap-px overflow-hidden rounded-full">
			{order.map((k, i) =>
				counts[i] === 0 ? null : (
					<span
						key={k}
						style={{
							flexGrow: counts[i] / total,
							backgroundColor: KIND_STYLE[k].fill,
							opacity: KIND_STYLE[k].opacity,
						}}
					/>
				)
			)}
		</div>
	);
}

function monogram(language: string) {
	if (/^python\s*3/i.test(language)) return "Py3";
	if (/^python/i.test(language)) return "Py";
	return language.length <= 3 ? language : language.slice(0, 2);
}

// Up to the cap, list every port; past it, leave the last row for "+N more".
function visiblePorts(names: string[], count: number) {
	const shown =
		count <= PREVIEW_CAPS.signaturePorts
			? names
			: names.slice(0, PREVIEW_CAPS.signaturePorts - 1);
	return { shown, more: count - shown.length };
}

function PortColumn(props: {
	names: string[];
	count: number;
	className: string;
	kinds?: number[];
	output?: boolean;
}) {
	const { shown, more } = visiblePorts(props.names, props.count);
	return (
		<div
			className={cn(
				"relative flex min-w-0 flex-1 flex-col gap-1",
				props.className
			)}
		>
			<svg
				width="30"
				height="68"
				className={cn(
					"absolute top-1/2 -translate-y-1/2 overflow-visible",
					props.output ? "right-full" : "left-full"
				)}
				aria-hidden
			>
				<g transform={props.output ? "translate(30 0) scale(-1 1)" : undefined}>
					{[...shown, ...(more ? [""] : [])].map((_, i, rows) => {
						const y = 34 + (i - (rows.length - 1) / 2) * 17;
						const dy = 34 - y,
							r = Math.min(4, Math.abs(dy) / 2),
							sign = Math.sign(dy);
						const kind = i < shown.length ? props.kinds?.[i] : 0;
						const style =
							kind === 1
								? KIND_STYLE.input
								: kind === 2
									? KIND_STYLE.panel
									: kind === 3
										? KIND_STYLE.param
										: undefined;
						return (
							<g key={i} opacity={i >= shown.length ? 0.45 : 1}>
								<path
									d={
										dy === 0
											? `M5 ${y} H30`
											: `M5 ${y} H${20 - r} Q20 ${y} 20 ${y + sign * r} V${34 - sign * r} Q20 34 ${20 + r} 34 H30`
									}
									fill="none"
									stroke="white"
									strokeWidth="1.15"
									strokeDasharray={i >= shown.length ? "2 2" : undefined}
									className="stroke-white/24 group-hover:stroke-white/42"
								/>
								<circle
									cx="5"
									cy={y}
									r={style ? 2.7 : 1.9}
									fill={style?.fill ?? "#737373"}
								>
									{style && (
										<title>
											{kind === 1 ? "Input" : kind === 2 ? "Panel" : "Param"}
										</title>
									)}
								</circle>
							</g>
						);
					})}
				</g>
			</svg>
			{shown.length === 0 && <span className="text-neutral-600">—</span>}
			{shown.map((name, i) => (
				<span key={i} className="truncate" title={name}>
					{name}
				</span>
			))}
			{more > 0 && <span className="text-neutral-600">+{more} more</span>}
		</div>
	);
}

function ScriptSignature({ signature }: { signature: PreviewSignature }) {
	return (
		<div className="absolute inset-x-0 top-0 bottom-6 flex items-center gap-[30px] px-4 font-mono text-[10.5px] leading-[13px] opacity-85 transition-opacity group-hover:opacity-100">
			<PortColumn
				kinds={signature.inputKinds}
				names={signature.inputs}
				count={signature.inputCount}
				className="text-right text-neutral-400"
			/>
			<span
				title={signature.language}
				className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] font-sans text-[10px] font-medium tracking-wide text-neutral-300"
			>
				{monogram(signature.language)}
			</span>
			<PortColumn
				output
				kinds={signature.outputKinds}
				names={signature.outputs}
				count={signature.outputCount}
				className="text-left text-neutral-300"
			/>
		</div>
	);
}

function portList(names: string[], count: number) {
	if (count === 0) return null;
	const { shown, more } = visiblePorts(names, count);
	return [...shown, ...(more > 0 ? [`+${more}`] : [])].join(", ");
}

export const RecipePreview = memo(function RecipePreview({
	data,
}: {
	data: PreviewData | null | undefined;
}) {
	const d = data ? renderDigest(data) : null;
	if (!d) return <PreviewBand missing={data === null} className="h-14" />;
	const inputs = [
		{ n: d.inputs.sliders, Icon: SlidersHorizontal, label: "sliders" },
		{ n: d.inputs.toggles, Icon: ToggleLeft, label: "toggles" },
		{ n: d.inputs.lists, Icon: List, label: "value lists" },
	].filter((i) => i.n > 0);
	const ops = [...d.scripts, ...d.keyComponents].slice(0, 2);
	const sig = d.signature;
	if (sig)
		return (
			<PreviewBand className="flex h-14 flex-col justify-center gap-2 px-3">
				<div className="flex min-w-0 items-center gap-2 font-mono text-[10.5px]">
					<span className="shrink-0 text-neutral-500" title={sig.language}>
						{monogram(sig.language)}
					</span>
					<span className="min-w-0 truncate text-neutral-400">
						{portList(sig.inputs, sig.inputCount) ?? (
							<span className="text-neutral-600">no inputs</span>
						)}
					</span>
					<ArrowRight
						className="size-3 shrink-0 text-neutral-600"
						aria-hidden
					/>
					<span className="min-w-0 truncate text-neutral-300">
						{portList(sig.outputs, sig.outputCount) ?? (
							<span className="text-neutral-600">no outputs</span>
						)}
					</span>
					<span className="ml-auto shrink-0 text-neutral-600 tabular-nums">
						{d.count}
					</span>
				</div>
				<CompositionBar digest={d} />
			</PreviewBand>
		);
	return (
		<PreviewBand className="flex h-14 flex-col justify-center gap-2 px-3">
			<div className="flex min-w-0 items-center gap-2 text-[11px] text-neutral-400">
				{inputs.length > 0 ? (
					<span className="flex shrink-0 items-center gap-1.5">
						{inputs.map(({ n, Icon, label }) => (
							<span
								key={label}
								className="flex items-center gap-0.5 text-green-300/80"
								title={`${n} ${label}`}
							>
								<Icon className="size-3" aria-hidden />
								<span className="tabular-nums">{n}</span>
							</span>
						))}
					</span>
				) : (
					<span className="shrink-0 text-neutral-600">no inputs</span>
				)}
				<ArrowRight className="size-3 shrink-0 text-neutral-600" aria-hidden />
				<span className="min-w-0 truncate font-mono text-[10.5px] text-neutral-300">
					{ops.join(" · ")}
				</span>
				<span className="ml-auto shrink-0 text-[10.5px] text-neutral-600 tabular-nums">
					{d.count}
				</span>
			</div>
			<CompositionBar digest={d} />
		</PreviewBand>
	);
});

export const ThumbnailPreview = memo(function ThumbnailPreview({
	data,
}: {
	data: PreviewData | null | undefined;
}) {
	const d = data ? renderDigest(data) : null;
	if (!d) return <PreviewBand missing={data === null} className="h-28" />;
	return (
		<PreviewBand className="h-28">
			{d.signature ? (
				<ScriptSignature signature={d.signature} />
			) : (
				<div className="absolute inset-0 px-3 pt-2 pb-7 opacity-60 transition-opacity group-hover:opacity-100">
					<Silhouette digest={d} dense={d.count > 60} />
				</div>
			)}
			<div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pt-4 pb-1.5 text-[10.5px]">
				<span className="shrink-0 text-neutral-300 tabular-nums">
					{d.count} {d.count === 1 ? "component" : "components"}
				</span>
				<span className="min-w-0 truncate font-mono text-neutral-500">
					{d.keyComponents.slice(0, 2).join(" · ")}
				</span>
				<span className="ml-auto flex min-w-0 gap-1 overflow-hidden">
					{/* The signature's monogram already names the language. */}
					{d.scripts.length > 0 && !d.signature && (
						<Chip
							tone="script"
							icon={<Code2 className="size-3 shrink-0" aria-hidden />}
							names={d.scripts}
							count={d.scriptCount}
						/>
					)}
					{d.plugins.length > 0 && (
						<Chip
							tone="plugin"
							icon={<Puzzle className="size-3 shrink-0" aria-hidden />}
							names={d.plugins}
							count={d.pluginCount}
						/>
					)}
				</span>
			</div>
		</PreviewBand>
	);
});
