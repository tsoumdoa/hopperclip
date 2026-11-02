import {
	ArrowRight,
	Code2,
	List,
	Puzzle,
	SlidersHorizontal,
	ToggleLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
	PREVIEW_KINDS,
	type PreviewData,
	type PreviewKind,
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

const KIND_STYLE: Record<
	PreviewKind,
	{ fill: string; opacity: number; label: string }
> = {
	component: { fill: "#737373", opacity: 0.75, label: "Component" },
	param: { fill: "#a3a3a3", opacity: 0.45, label: "Param" },
	input: { fill: "#86efac", opacity: 0.75, label: "Slider / toggle" },
	script: { fill: "#e5e5e5", opacity: 0.85, label: "Script" },
	panel: { fill: "#fde68a", opacity: 0.55, label: "Panel" },
	plugin: { fill: "#c4b5fd", opacity: 0.75, label: "Plugin" },
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

function Chip(props: {
	children: React.ReactNode;
	tone?: "default" | "script" | "plugin";
}) {
	return (
		<span
			className={cn(
				"inline-flex h-5 max-w-full items-center gap-1 truncate rounded px-1.5 font-mono text-[10.5px]",
				props.tone === "plugin"
					? "bg-violet-300/10 text-violet-200/90"
					: props.tone === "script"
						? "bg-white/10 text-neutral-200"
						: "bg-white/[0.04] text-neutral-400"
			)}
		>
			{props.children}
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

export function RecipePreview({
	data,
}: {
	data: PreviewData | null | undefined;
}) {
	const d = data ? renderDigest(data) : null;
	if (!d) return null;
	const inputs = [
		{ n: d.inputs.sliders, Icon: SlidersHorizontal, label: "sliders" },
		{ n: d.inputs.toggles, Icon: ToggleLeft, label: "toggles" },
		{ n: d.inputs.lists, Icon: List, label: "value lists" },
	].filter((i) => i.n > 0);
	const ops = [...d.scripts, ...d.keyComponents].slice(0, 2);
	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-lg bg-white/[0.025] px-2.5 py-2 ring-1 ring-white/[0.05] ring-inset",
				"mt-3"
			)}
		>
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
		</div>
	);
}

export function ThumbnailPreview({
	data,
}: {
	data: PreviewData | null | undefined;
}) {
	const d = data ? renderDigest(data) : null;
	return (
		<div
			className={cn(
				"relative overflow-hidden",
				canvasBg,
				"-mx-4 -mt-4 mb-4 h-28 rounded-t-xl border-b border-white/[0.06]"
			)}
		>
			{d ? (
				<>
					<div className="absolute inset-0 px-3 pt-2 pb-7 opacity-60 transition-opacity group-hover:opacity-100">
						<Silhouette digest={d} dense={d.count > 60} />
					</div>
					<div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pt-4 pb-1.5 text-[10.5px]">
						<span className="text-neutral-300 tabular-nums">
							{d.count} components
						</span>
						<span className="min-w-0 truncate font-mono text-neutral-500">
							{d.keyComponents.slice(0, 2).join(" · ")}
						</span>
						<span className="ml-auto flex shrink-0 gap-1">
							{d.scripts.map((s) => (
								<Chip key={s} tone="script">
									<Code2 className="size-3" aria-hidden />
									{s}
								</Chip>
							))}
							{d.plugins.slice(0, 1).map((p) => (
								<Chip key={p} tone="plugin">
									<Puzzle className="size-3" aria-hidden />
									{p}
									{d.plugins.length > 1 && ` +${d.plugins.length - 1}`}
								</Chip>
							))}
						</span>
					</div>
				</>
			) : (
				data === null && (
					<div className="flex h-full items-center justify-center text-[11px] text-neutral-600">
						Preview appears after you open this card
					</div>
				)
			)}
		</div>
	);
}
