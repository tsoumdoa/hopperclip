import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PrimarySignUp, SecondaryDuckerLink } from "../ctas";

type Stage = "original" | "changed" | "diff";

type DemoNode = {
	id: string;
	label: string;
	x: number;
	y: number;
	kind: "component" | "value";
	status: "unchanged" | "added" | "modified" | "removed";
	change?: string;
};

const NODES: DemoNode[] = [
	{ id: "a", label: "Point", x: 8, y: 28, kind: "component", status: "unchanged" },
	{ id: "b", label: "Number", x: 8, y: 58, kind: "value", status: "modified", change: "Value 2.0 → 3.5" },
	{ id: "c", label: "Move", x: 38, y: 42, kind: "component", status: "modified", change: "Input G: Expression added" },
	{ id: "d", label: "Panel", x: 68, y: 28, kind: "component", status: "removed" },
	{ id: "e", label: "Cull", x: 68, y: 58, kind: "component", status: "added" },
];

const statusRing: Record<DemoNode["status"], string> = {
	unchanged: "ring-transparent opacity-40",
	added: "ring-green-400/80",
	modified: "ring-yellow-300/80",
	removed: "ring-red-400/80 opacity-70",
};

export function Lp1DiffTheater() {
	const [stage, setStage] = useState<Stage>("diff");
	const [focusId, setFocusId] = useState<string | null>("c");

	const visible = useMemo(() => {
		if (stage === "original") {
			return NODES.filter((n) => n.status !== "added").map((n) => ({
				...n,
				status: "unchanged" as const,
			}));
		}
		if (stage === "changed") {
			return NODES.filter((n) => n.status !== "removed").map((n) => ({
				...n,
				status: "unchanged" as const,
			}));
		}
		return NODES;
	}, [stage]);

	const focused = NODES.find((n) => n.id === focusId);

	return (
		<div className="relative overflow-hidden pb-16">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] opacity-40"
				style={{
					backgroundImage:
						"linear-gradient(#2a2a28 1px, transparent 1px), linear-gradient(90deg, #2a2a28 1px, transparent 1px)",
					backgroundSize: "40px 40px",
					backgroundColor: "#121210",
					maskImage:
						"linear-gradient(to bottom, black 40%, transparent 95%)",
				}}
			/>

			<section className="relative grid min-h-[70vh] items-center gap-10 pt-6 lg:grid-cols-[1.05fr_0.95fr]">
				<div className="max-w-xl">
					<p className="mb-3 text-5xl font-bold tracking-tight md:text-6xl">
						Hopper Clip
					</p>
					<h1 className="text-2xl font-semibold text-neutral-100 md:text-3xl">
						See what actually changed in a Grasshopper definition.
					</h1>
					<p className="mt-4 text-base text-neutral-400 md:text-lg">
						DuckerWeb Diff matches components by instance GUID, then paints
						adds, edits, and removals — including port mapping and expression
						details.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<PrimarySignUp />
						<SecondaryDuckerLink label="Try Diff in DuckerWeb" />
					</div>
				</div>

				<div className="relative">
					<div className="mb-3 flex gap-1 rounded-lg border border-neutral-800 bg-neutral-950/80 p-1">
						{(
							[
								["original", "Original"],
								["changed", "Changed"],
								["diff", "Diff"],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								onClick={() => setStage(id)}
								className={cn(
									"flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
									stage === id
										? "bg-neutral-200 text-black"
										: "text-neutral-400 hover:text-white"
								)}
							>
								{label}
							</button>
						))}
					</div>

					<div
						className="relative aspect-[4/3] overflow-hidden rounded-xl border border-neutral-700"
						style={{ backgroundColor: "#ccc9c0" }}
					>
						<div
							aria-hidden
							className="absolute inset-0"
							style={{
								backgroundImage:
									"linear-gradient(#bbb8af 1px, transparent 1px), linear-gradient(90deg, #bbb8af 1px, transparent 1px)",
								backgroundSize: "32px 32px",
							}}
						/>

						<svg className="absolute inset-0 h-full w-full" aria-hidden>
							<path
								d="M 18% 35% C 30% 35%, 30% 48%, 40% 48%"
								fill="none"
								stroke={stage === "diff" ? "#5a5a5a" : "#5a5a5a"}
								strokeWidth="2"
							/>
							<path
								d="M 18% 65% C 30% 65%, 30% 48%, 40% 48%"
								fill="none"
								stroke="#5a5a5a"
								strokeWidth="2"
							/>
							{stage === "diff" ? (
								<>
									<path
										d="M 52% 48% C 60% 48%, 60% 35%, 70% 35%"
										fill="none"
										stroke="#ef4444"
										strokeWidth="2"
										strokeDasharray="4 3"
										opacity="0.85"
									/>
									<path
										d="M 52% 48% C 60% 48%, 60% 65%, 70% 65%"
										fill="none"
										stroke="#22c55e"
										strokeWidth="2"
									/>
								</>
							) : stage === "original" ? (
								<path
									d="M 52% 48% C 60% 48%, 60% 35%, 70% 35%"
									fill="none"
									stroke="#5a5a5a"
									strokeWidth="2"
								/>
							) : (
								<path
									d="M 52% 48% C 60% 48%, 60% 65%, 70% 65%"
									fill="none"
									stroke="#5a5a5a"
									strokeWidth="2"
								/>
							)}
						</svg>

						{visible.map((node) => (
							<button
								key={node.id}
								type="button"
								onClick={() => setFocusId(node.id)}
								className={cn(
									"absolute -translate-x-1/2 -translate-y-1/2 rounded-sm px-2.5 py-1.5 text-[11px] font-medium text-neutral-900 shadow-sm ring-2 transition-all duration-300",
									node.kind === "value" ? "bg-[#f5f07a]" : "bg-[#b8b5ae]",
									stage === "diff" ? statusRing[node.status] : "ring-transparent",
									focusId === node.id && stage === "diff"
										? "scale-105 ring-offset-1 ring-offset-[#ccc9c0]"
										: ""
								)}
								style={{ left: `${node.x}%`, top: `${node.y}%` }}
							>
								{node.label}
							</button>
						))}

						{stage === "diff" ? (
							<div className="absolute right-3 bottom-3 left-3 flex flex-wrap gap-2 text-[10px] font-medium">
								<span className="rounded bg-green-500/20 px-2 py-1 text-green-900 ring-1 ring-green-600/40">
									+1 added
								</span>
								<span className="rounded bg-yellow-400/30 px-2 py-1 text-yellow-950 ring-1 ring-yellow-600/40">
									~2 modified
								</span>
								<span className="rounded bg-red-500/20 px-2 py-1 text-red-900 ring-1 ring-red-600/40">
									−1 removed
								</span>
							</div>
						) : null}
					</div>

					<div className="mt-3 min-h-16 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
						{stage === "diff" && focused?.change ? (
							<>
								<p className="text-xs text-neutral-500">
									Changed component · {focused.label}
								</p>
								<p className="mt-1 text-sm text-neutral-200">{focused.change}</p>
							</>
						) : (
							<p className="text-sm text-neutral-500">
								{stage === "diff"
									? "Click a highlighted node to read the change detail."
									: "Flip to Diff to overlay adds, edits, and removals."}
							</p>
						)}
					</div>
				</div>
			</section>

			<section className="relative mt-16 max-w-3xl">
				<h2 className="text-xl font-semibold">Share the definition. Inspect the delta.</h2>
				<p className="mt-2 text-neutral-400">
					Hopper Clip stores and shares your scripts. DuckerWeb Diff tells you
					exactly what logic moved — not just that the canvas was rearranged.
				</p>
			</section>
		</div>
	);
}
