import {
	Cable,
	Clipboard,
	FileUp,
	GitCompareArrows,
	Move,
	RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type {
	GHDiffResult,
	GHDiffStatus,
	GHFlowCanvasFocus,
} from "../types/type";
import { GHFlowCanvas } from "./GHFlowCanvas";
import { useModifierKeyLabel } from "../../hooks/use-modifier-key-label";

type GHDiffViewProps = {
	diff: GHDiffResult | null;
	error: string;
	onPasteComparison: () => void;
	onFileSelected: (file: File) => void;
	onClearComparison: () => void;
	originalFileName: string;
	comparisonFileName: string;
	comparisonRejected: boolean;
};

type DiffFilter = Exclude<GHDiffStatus, "unchanged"> | "layout" | "connections";

const statusStyles: Record<
	Exclude<GHDiffStatus, "unchanged">,
	{ label: string; text: string; border: string; bg: string; dot: string }
> = {
	added: {
		label: "Added",
		text: "text-green-300",
		border: "border-green-500/30",
		bg: "bg-green-500/10",
		dot: "bg-green-400",
	},
	modified: {
		label: "Modified",
		text: "text-yellow-200",
		border: "border-yellow-400/30",
		bg: "bg-yellow-400/10",
		dot: "bg-yellow-300",
	},
	removed: {
		label: "Removed",
		text: "text-red-300",
		border: "border-red-500/30",
		bg: "bg-red-500/10",
		dot: "bg-red-400",
	},
};

export function ComparisonActions({
	onPaste,
	onFileSelected,
	compact = false,
}: {
	onPaste: () => void;
	onFileSelected: (file: File) => void;
	compact?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const modifier = useModifierKeyLabel();
	const buttonClass = cn(
		"inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
		compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
	);

	return (
		<div className="flex flex-col gap-2 sm:flex-row">
			<button type="button" onClick={onPaste} className={buttonClass}>
				<Clipboard className="h-4 w-4 text-neutral-400" />
				Paste changed GhXml
				<span className="rounded border border-neutral-700 px-1 py-0.5 font-mono text-[10px] text-neutral-500">
					{modifier}+V
				</span>
			</button>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				className={buttonClass}
			>
				<FileUp className="h-4 w-4 text-neutral-400" />
				Browse changed file
			</button>
			<input
				ref={inputRef}
				type="file"
				accept=".gh,.ghx,application/gzip,application/xml,application/octet-stream"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) onFileSelected(file);
					event.target.value = "";
				}}
			/>
		</div>
	);
}

let canvasRemountSeq = 0;

export function GHDiffView({
	diff,
	error,
	onPasteComparison,
	onFileSelected,
	onClearComparison,
	originalFileName,
	comparisonFileName,
	comparisonRejected,
}: GHDiffViewProps) {
	const [focus, setFocus] = useState<GHFlowCanvasFocus | null>(null);
	const [filter, setFilter] = useState<DiffFilter | null>(null);
	const modifier = useModifierKeyLabel();
	// Remounting the canvas when a new comparison arrives re-runs fitView, so
	// the viewport never shows a stale framing from the previous diff.
	const canvasKey = useMemo(() => ++canvasRemountSeq, [diff]);

	useEffect(() => {
		setFocus(null);
		setFilter(null);
	}, [diff]);

	if (!diff) {
		return (
			<div className="mx-auto flex min-h-[380px] max-w-3xl items-center justify-center py-8">
				<div className="w-full rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/70 p-6 text-center sm:p-10">
					<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10">
						<GitCompareArrows className="h-6 w-6 text-yellow-300" />
					</div>
					<p className="text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase">
						{comparisonRejected ? "Comparison stopped" : "Original loaded"}
					</p>
					<h2 className="mt-2 text-xl font-semibold text-neutral-100">
						{comparisonRejected
							? "Definitions appear unrelated"
							: "Add the changed definition"}
					</h2>
					{comparisonRejected ? (
						<>
							<p className="mt-2 text-sm text-neutral-300">
								<span className="font-medium">{originalFileName}</span>
								<span className="mx-2 text-neutral-600">→</span>
								<span className="font-medium">{comparisonFileName}</span>
							</p>
							<p className="mx-auto mt-3 max-w-lg rounded-lg border border-blue-900/60 bg-blue-950/30 px-4 py-3 text-left text-sm leading-6 text-blue-200">
								{error}
							</p>
						</>
					) : (
						<p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-400">
							Ducker compares components, parameters, scripts, and connections.
							Moving components around the canvas does not count as a logic
							change.
						</p>
					)}
					<div className="mt-6 flex justify-center">
						<ComparisonActions
							onPaste={onPasteComparison}
							onFileSelected={onFileSelected}
						/>
					</div>
					<p className="mt-4 text-xs text-neutral-600">
						Tip: press {modifier}+V to paste or drop the changed .gh or .ghx
						file anywhere here.
					</p>
					{error && !comparisonRejected && (
						<p className="mt-5 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-left text-sm font-medium text-red-300">
							{error}
						</p>
					)}
				</div>
			</div>
		);
	}

	const logicChanges =
		diff.counts.added +
		diff.counts.modified +
		diff.counts.removed +
		diff.addedWires +
		diff.removedWires;
	const changedEdges = diff.edges.filter(
		(edge) => edge.data?.diffStatus !== "unchanged"
	);
	const connectionKeys = new Set(
		changedEdges.flatMap((edge) => [edge.source, edge.target])
	);
	const visibleComponents = diff.components.filter((component) => {
		if (filter === "layout") return component.layoutMoved;
		if (filter === "connections") return connectionKeys.has(component.key);
		if (filter) return component.status === filter;
		return component.status !== "unchanged" || component.layoutMoved;
	});
	const visibleKeys = new Set(
		visibleComponents.map((component) => component.key)
	);
	const canvasNodes = diff.nodes.map((node) => ({
		...node,
		className: cn(
			node.className,
			filter && !visibleKeys.has(node.id) && "gh-diff-filter-ghost"
		),
	}));
	const canvasEdges = diff.edges.map((edge) => {
		const isMatch =
			!filter ||
			(filter === "connections"
				? edge.data?.diffStatus !== "unchanged"
				: visibleKeys.has(edge.source) && visibleKeys.has(edge.target));
		return {
			...edge,
			style: {
				...edge.style,
				opacity: filter && !isMatch ? 0.14 : edge.style?.opacity,
			},
		};
	});
	const toggleFilter = (next: DiffFilter) =>
		setFilter((current) => (current === next ? null : next));

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="text-lg font-semibold text-neutral-100">
							Logic diff
						</h2>
						<span
							className={cn(
								"rounded-full px-2.5 py-1 text-xs font-semibold",
								logicChanges === 0
									? "bg-green-500/10 text-green-300"
									: "bg-yellow-400/10 text-yellow-200"
							)}
						>
							{logicChanges === 0
								? "No logic changes"
								: `${logicChanges} logic change${logicChanges === 1 ? "" : "s"}`}
						</span>
					</div>
					<p className="mt-1 text-sm text-neutral-400">
						<span className="font-medium text-neutral-200">
							{originalFileName}
						</span>
						<span className="mx-2 text-neutral-600">→</span>
						<span className="font-medium text-neutral-200">
							{comparisonFileName}
						</span>
						<span className="ml-2 text-neutral-600">
							· matched by instance ID
						</span>
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<ComparisonActions
						onPaste={onPasteComparison}
						onFileSelected={onFileSelected}
						compact
					/>
					<button
						type="button"
						onClick={onClearComparison}
						className="inline-flex items-center gap-2 px-2 py-2 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-200"
					>
						<RotateCcw className="h-3.5 w-3.5" />
						Reset
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
				{(["added", "modified", "removed"] as const).map((status) => {
					const style = statusStyles[status];
					return (
						<button
							type="button"
							onClick={() => toggleFilter(status)}
							aria-pressed={filter === status}
							key={status}
							className={cn(
								"rounded-xl border px-4 py-3 text-left transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
								style.border,
								style.bg,
								filter === status && "ring-2 ring-white/70"
							)}
						>
							<p className={cn("text-2xl font-semibold", style.text)}>
								{diff.counts[status]}
							</p>
							<p className="mt-0.5 text-xs font-medium text-neutral-400">
								{style.label}
							</p>
						</button>
					);
				})}
				<button
					type="button"
					onClick={() => toggleFilter("layout")}
					aria-pressed={filter === "layout"}
					className={cn(
						"rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-left transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:outline-none",
						filter === "layout" && "ring-2 ring-blue-300/70"
					)}
				>
					<div className="flex items-center gap-2 text-blue-300">
						<Move className="h-4 w-4" />
						<p className="text-lg font-semibold">{diff.layoutMoves}</p>
					</div>
					<p className="mt-1 text-xs font-medium text-neutral-400">
						Layout change
					</p>
				</button>
				<button
					type="button"
					onClick={() => toggleFilter("connections")}
					aria-pressed={filter === "connections"}
					className={cn(
						"rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-left transition hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
						filter === "connections" && "ring-2 ring-white/70"
					)}
				>
					<div className="flex items-center gap-2 text-neutral-200">
						<Cable className="h-4 w-4" />
						<p className="text-lg font-semibold">
							<span className="text-green-300">+{diff.addedWires}</span>{" "}
							<span className="text-red-300">−{diff.removedWires}</span>
						</p>
					</div>
					<p className="mt-1 text-xs font-medium text-neutral-500">
						Connections
					</p>
				</button>
			</div>

			{error && (
				<p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
					{error}
				</p>
			)}

			<div className="grid h-[860px] shrink-0 grid-rows-[300px_minmax(0,1fr)] gap-4 lg:h-auto lg:min-h-0 lg:flex-1 lg:grid-cols-[290px_minmax(0,1fr)] lg:grid-rows-1">
				<aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/80">
					<div className="border-b border-neutral-800 px-4 py-3">
						<p className="text-sm font-semibold text-neutral-200">
							Changed components
						</p>
						<p className="mt-0.5 text-xs text-neutral-600">
							{filter
								? `Filtering by ${filter === "layout" ? "layout change" : filter === "connections" ? "connection changes" : filter}`
								: "Click a change to locate it"}{" "}
							· {diff.counts.unchanged} unchanged
						</p>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						{visibleComponents.length === 0 ? (
							<div className="px-3 py-8 text-center text-sm text-neutral-500">
								{filter
									? "No changes match this filter."
									: "The definitions have the same logic."}
							</div>
						) : (
							visibleComponents.map((component) => {
								const style =
									component.status === "unchanged"
										? null
										: statusStyles[component.status];
								return (
									<button
										key={component.key}
										type="button"
										onClick={() =>
											setFocus((previous) => ({
												nodeId: component.key,
												nonce: (previous?.nonce ?? 0) + 1,
											}))
										}
										className={cn(
											"w-full rounded-lg border px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none",
											focus?.nodeId === component.key
												? "border-neutral-700 bg-neutral-900"
												: "border-transparent hover:border-neutral-800 hover:bg-neutral-900/70"
										)}
									>
										<div className="flex items-start gap-2.5">
											<span
												className={cn(
													"mt-1.5 h-2 w-2 shrink-0 rounded-full",
													style?.dot ?? "bg-blue-400"
												)}
											/>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium text-neutral-200">
													{component.label}
												</p>
												<p
													className={cn(
														"mt-0.5 text-xs",
														style?.text ?? "text-blue-300"
													)}
												>
													{[
														...component.changes,
														...(component.layoutMoved ? ["Layout change"] : []),
													].join(" · ")}
												</p>
											</div>
										</div>
									</button>
								);
							})
						)}
					</div>
				</aside>

				<div className="relative min-h-0 overflow-hidden rounded-xl border border-neutral-800 bg-[#cbc9c8]">
					<div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-3 rounded-lg border border-black/10 bg-white/85 px-3 py-2 text-[11px] font-semibold text-neutral-700 shadow-sm backdrop-blur">
						<span className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-green-500" />
							Added
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-yellow-400" />
							Modified
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-red-500" />
							Removed
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-blue-400" />
							Layout change
						</span>
					</div>
					<GHFlowCanvas
						key={canvasKey}
						nodes={canvasNodes}
						edges={canvasEdges}
						focus={focus}
					/>
				</div>
			</div>
		</div>
	);
}
