/**
 * Lightweight, dependency-free mock of the Hopper Clip Grasshopper canvas.
 *
 * Reproduces the authentic look of the real GHFlowCanvas — beige canvas,
 * three-segment component capsules, dark wires, panel/slider nodes, and the
 * added/removed/modified diff glow — without pulling in React Flow. Used as the
 * product centerpiece across the landing design options.
 */
import type { CSSProperties } from "react";

const CW = 820;
const CH = 470;

type Kind = "comp" | "panel" | "slider";
type DiffState = "added" | "removed" | "modified";

type NodeDef = {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	label: string;
	value?: string;
	kind?: Kind;
	accent?: string;
	ins?: number;
	outs?: number;
	diff?: DiffState;
};

type Wire = [from: string, out: number, to: string, into: number];

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

function inAnchor(n: NodeDef, i: number) {
	const count = n.ins ?? 1;
	return { x: n.x, y: n.y + (n.h * (i + 1)) / (count + 1) };
}
function outAnchor(n: NodeDef, i: number) {
	const count = n.outs ?? 1;
	return { x: n.x + n.w, y: n.y + (n.h * (i + 1)) / (count + 1) };
}

const DIFF_STROKE: Record<DiffState, string> = {
	added: "#22c55e",
	removed: "#ef4444",
	modified: "#eab308",
};

function diffStyle(diff?: DiffState): CSSProperties {
	if (!diff) return {};
	const c = DIFF_STROKE[diff];
	return {
		outline: `2px solid ${c}`,
		outlineOffset: "2px",
		boxShadow: `0 0 0 1px ${c}, 0 0 12px 1px ${c}bb`,
		filter: diff === "removed" ? "grayscale(0.5)" : undefined,
		borderRadius: "4px",
	};
}

/** A single Grasshopper component capsule: side · center label · side. */
function CompNode({ label, accent = "#808080" }: { label: string; accent?: string }) {
	return (
		<div className="flex h-full w-full overflow-hidden rounded-[3px] border border-[#3a3a3a] shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
			<div className="w-[20%] shrink-0 border-r border-[#3a3a3a] bg-[#e8e8e8]" />
			<div
				className="flex flex-1 items-center justify-center"
				style={{ backgroundColor: accent }}
			>
				<span
					className="text-[9px] leading-none font-bold tracking-tight text-white/95 md:text-[10px]"
					style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
				>
					{label}
				</span>
			</div>
			<div className="w-[20%] shrink-0 border-l border-[#3a3a3a] bg-[#e8e8e8]" />
		</div>
	);
}

function PanelNode({ label, value }: { label: string; value?: string }) {
	return (
		<div className="flex h-full w-full flex-col overflow-hidden rounded-[3px] border border-[#3a3a3a] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
			<div className="flex h-[38%] shrink-0 items-center justify-center border-b border-[#3a3a3a] bg-[#e8e8e8] px-1 text-[8px] font-medium text-[#222] md:text-[9px]">
				{label}
			</div>
			<div className="flex flex-1 items-center justify-center px-1 font-mono text-[8px] text-[#444] md:text-[9px]">
				{value}
			</div>
		</div>
	);
}

function SliderNode({ label, value }: { label: string; value?: string }) {
	return (
		<div className="flex h-full w-full flex-col justify-center gap-1 overflow-hidden rounded-[3px] border border-[#3a3a3a] bg-[#ececec] px-2 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
			<div className="flex items-baseline justify-between text-[8px] text-[#333] md:text-[9px]">
				<span className="font-medium">{label}</span>
				<span className="font-mono text-[#555]">{value}</span>
			</div>
			<div className="relative h-1 rounded-full bg-[#c9c9c9]">
				<div className="absolute inset-y-0 left-0 w-[62%] rounded-full bg-[#8a8a8a]" />
				<div className="absolute top-1/2 left-[62%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3a3a3a] bg-white" />
			</div>
		</div>
	);
}

function renderNode(n: NodeDef, monochrome: boolean) {
	if (n.kind === "panel") return <PanelNode label={n.label} value={n.value} />;
	if (n.kind === "slider") return <SliderNode label={n.label} value={n.value} />;
	return <CompNode label={n.label} accent={monochrome ? undefined : n.accent} />;
}

/** A believable definition: sliders + surface → divide/evaluate → dispatch → loft/preview. */
const NODES: NodeDef[] = [
	{ id: "srf", x: 40, y: 74, w: 52, h: 104, label: "Srf", ins: 1, outs: 1 },
	{ id: "cnt", x: 30, y: 214, w: 150, h: 30, kind: "slider", label: "Count", value: "24", outs: 1 },
	{ id: "dom", x: 34, y: 300, w: 150, h: 30, kind: "slider", label: "Domain", value: "0.0 – 1.0", outs: 1 },
	{ id: "div", x: 214, y: 92, w: 54, h: 96, label: "Divide", ins: 3, outs: 2 },
	{ id: "evl", x: 214, y: 250, w: 60, h: 84, label: "Evaluate", ins: 3, outs: 2 },
	{ id: "dsp", x: 398, y: 150, w: 54, h: 92, label: "Dispatch", ins: 2, outs: 2 },
	{ id: "pnl", x: 388, y: 300, w: 104, h: 60, kind: "panel", label: "Values", value: "0.42", ins: 1 },
	{ id: "lft", x: 600, y: 108, w: 46, h: 88, label: "Loft", accent: "#6f8fae", ins: 1, outs: 1 },
	{ id: "prv", x: 604, y: 254, w: 58, h: 72, label: "Preview", accent: "#5f8a7d", ins: 1, outs: 0 },
];

const WIRES: Wire[] = [
	["srf", 0, "div", 0],
	["cnt", 0, "div", 1],
	["dom", 0, "div", 2],
	["srf", 0, "evl", 0],
	["cnt", 0, "evl", 1],
	["div", 0, "dsp", 0],
	["evl", 0, "dsp", 1],
	["div", 1, "lft", 0],
	["dsp", 0, "lft", 0],
	["dsp", 1, "pnl", 0],
	["lft", 0, "prv", 0],
];

/** Diff annotations applied only in the `diff` variant. */
const DIFF: Record<string, DiffState> = {
	evl: "added",
	dom: "added",
	dsp: "modified",
	pnl: "removed",
};

function wirePath(a: { x: number; y: number }, b: { x: number; y: number }) {
	const dx = Math.max(28, Math.abs(b.x - a.x) * 0.5);
	return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

export function GhCanvas({
	variant = "plain",
	monochrome = false,
	className = "",
}: {
	variant?: "plain" | "diff";
	monochrome?: boolean;
	className?: string;
}) {
	const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
	const ports: { x: number; y: number; diff?: DiffState }[] = [];
	for (const n of NODES) {
		for (let i = 0; i < (n.ins ?? 0); i++)
			ports.push({ ...inAnchor(n, i), diff: variant === "diff" ? DIFF[n.id] : undefined });
		for (let i = 0; i < (n.outs ?? 0); i++)
			ports.push({ ...outAnchor(n, i), diff: variant === "diff" ? DIFF[n.id] : undefined });
	}

	return (
		<div
			className={`relative aspect-[820/470] w-full overflow-hidden ${className}`}
			style={{
				backgroundColor: "#ebe9e4",
				backgroundImage:
					"radial-gradient(circle, rgba(90,88,82,0.28) 1px, transparent 1.4px)",
				backgroundSize: "22px 22px",
			}}
			aria-hidden
		>
			<svg
				className="absolute inset-0 h-full w-full"
				viewBox={`0 0 ${CW} ${CH}`}
				fill="none"
			>
				<title>Grasshopper definition</title>
				{WIRES.map(([from, oi, to, ii], idx) => {
					const a = outAnchor(byId[from], oi);
					const b = inAnchor(byId[to], ii);
					const dstDiff = variant === "diff" ? DIFF[to] : undefined;
					const srcDiff = variant === "diff" ? DIFF[from] : undefined;
					const active = dstDiff ?? srcDiff;
					const stroke = active ? DIFF_STROKE[active] : "#555552";
					return (
						<path
							key={idx}
							d={wirePath(a, b)}
							stroke={stroke}
							strokeWidth={active ? 2.1 : 1.6}
							strokeLinecap="round"
							opacity={active ? 0.9 : 0.72}
						/>
					);
				})}
				{ports.map((p, i) => (
					<circle
						key={i}
						cx={p.x}
						cy={p.y}
						r={3}
						fill="#f4f4f4"
						stroke={p.diff ? DIFF_STROKE[p.diff] : "#3a3a3a"}
						strokeWidth={1.2}
					/>
				))}
			</svg>

			{NODES.map((n) => (
				<div
					key={n.id}
					className="absolute"
					style={{
						left: pct(n.x, CW),
						top: pct(n.y, CH),
						width: pct(n.w, CW),
						height: pct(n.h, CH),
						...(variant === "diff" ? diffStyle(DIFF[n.id]) : {}),
					}}
				>
					{renderNode(n, monochrome)}
				</div>
			))}
		</div>
	);
}

/** macOS-style browser chrome wrapper for the canvas. */
export function BrowserFrame({
	url = "hopperclip.com/ghcards/panel-facade",
	tabs,
	children,
	className = "",
}: {
	url?: string;
	tabs?: { label: string; active?: boolean }[];
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl ${className}`}
		>
			<div className="flex items-center gap-2 border-b border-black/10 bg-[#f5f4f1] px-3 py-2.5">
				<span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
				<span className="h-3 w-3 rounded-full bg-[#febc2e]" />
				<span className="h-3 w-3 rounded-full bg-[#28c840]" />
				<div className="ml-3 hidden max-w-full flex-1 truncate rounded-md bg-black/[0.05] px-3 py-1 text-center font-mono text-[11px] text-[#6b6b6b] sm:block">
					{url}
				</div>
			</div>
			{tabs ? (
				<div className="flex items-center gap-1 border-b border-black/10 bg-[#efeeea] px-2 pt-1.5">
					{tabs.map((t) => (
						<span
							key={t.label}
							className={`rounded-t-md px-3 py-1.5 text-[11px] font-medium ${
								t.active
									? "bg-[#ebe9e4] text-[#333]"
									: "text-[#8a8a86] hover:text-[#555]"
							}`}
						>
							{t.label}
						</span>
					))}
				</div>
			) : null}
			{children}
		</div>
	);
}

/** Small colored legend used with the diff variant. */
export function DiffLegend({ className = "" }: { className?: string }) {
	const items = [
		{ label: "Added", color: DIFF_STROKE.added, count: 2 },
		{ label: "Modified", color: DIFF_STROKE.modified, count: 1 },
		{ label: "Removed", color: DIFF_STROKE.removed, count: 1 },
	];
	return (
		<div className={`flex flex-wrap items-center gap-2 ${className}`}>
			{items.map((it) => (
				<span
					key={it.label}
					className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300"
				>
					<span
						className="h-2 w-2 rounded-full"
						style={{ backgroundColor: it.color, boxShadow: `0 0 8px ${it.color}` }}
					/>
					<span className="font-medium text-white">{it.count}</span> {it.label}
				</span>
			))}
		</div>
	);
}
