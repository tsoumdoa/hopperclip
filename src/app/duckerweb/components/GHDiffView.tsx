import {
	Cable,
	Clipboard,
	FileUp,
	GitCompareArrows,
	Move,
	RotateCcw,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { GHDiffResult, GHDiffStatus } from "../types/type";
import { GHFlowCanvas } from "./GHFlowCanvas";

type GHDiffViewProps = {
	diff: GHDiffResult | null;
	error: string;
	onPasteComparison: () => void;
	onFileSelected: (file: File) => void;
	onClearComparison: () => void;
};

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

function ComparisonActions({
	onPaste,
	onFileSelected,
	compact = false,
}: {
	onPaste: () => void;
	onFileSelected: (file: File) => void;
	compact?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const buttonClass = cn(
		"inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
		compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
	);

	return (
		<div className="flex flex-col gap-2 sm:flex-row">
			<button type="button" onClick={onPaste} className={buttonClass}>
				<Clipboard className="h-4 w-4 text-neutral-400" />
				Paste changed GhXml
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

export function GHDiffView({
	diff,
	error,
	onPasteComparison,
	onFileSelected,
	onClearComparison,
}: GHDiffViewProps) {
	if (!diff) {
		return (
			<div className="mx-auto flex min-h-[380px] max-w-3xl items-center justify-center py-8">
				<div className="w-full rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/70 p-6 text-center sm:p-10">
					<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10">
						<GitCompareArrows className="h-6 w-6 text-yellow-300" />
					</div>
					<p className="text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase">
						Original loaded
					</p>
					<h2 className="mt-2 text-xl font-semibold text-neutral-100">
						Add the changed definition
					</h2>
					<p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-400">
						Ducker compares components, parameters, scripts, and connections.
						Moving components around the canvas does not count as a logic
						change.
					</p>
					<div className="mt-6 flex justify-center">
						<ComparisonActions
							onPaste={onPasteComparison}
							onFileSelected={onFileSelected}
						/>
					</div>
					<p className="mt-4 text-xs text-neutral-600">
						Tip: you can also drop the changed .gh or .ghx file anywhere here.
					</p>
					{error && (
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
	const changedComponents = diff.components.filter(
		(component) => component.status !== "unchanged"
	);

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
					<p className="mt-1 text-sm text-neutral-500">
						Original → changed · matched by Grasshopper instance ID
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
						<div
							key={status}
							className={cn(
								"rounded-xl border px-4 py-3",
								style.border,
								style.bg
							)}
						>
							<p className={cn("text-2xl font-semibold", style.text)}>
								{diff.counts[status]}
							</p>
							<p className="mt-0.5 text-xs font-medium text-neutral-400">
								{style.label}
							</p>
						</div>
					);
				})}
				<div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
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
				</div>
				<div className="col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 lg:col-span-1">
					<div className="flex items-center gap-2 text-neutral-300">
						<Move className="h-4 w-4" />
						<p className="text-lg font-semibold">{diff.layoutMoves}</p>
					</div>
					<p className="mt-1 text-xs font-medium text-neutral-500">
						Layout moves ignored
					</p>
				</div>
			</div>

			{error && (
				<p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
					{error}
				</p>
			)}

			<div className="grid min-h-[560px] flex-1 gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
				<aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/80">
					<div className="border-b border-neutral-800 px-4 py-3">
						<p className="text-sm font-semibold text-neutral-200">
							Changed components
						</p>
						<p className="mt-0.5 text-xs text-neutral-600">
							{diff.counts.unchanged} unchanged hidden from this list
						</p>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						{changedComponents.length === 0 ? (
							<div className="px-3 py-8 text-center text-sm text-neutral-500">
								The definitions have the same logic.
							</div>
						) : (
							changedComponents.map((component) => {
								const style =
									statusStyles[
										component.status as Exclude<GHDiffStatus, "unchanged">
									];
								return (
									<div
										key={component.key}
										className="rounded-lg border border-transparent px-3 py-2.5 hover:border-neutral-800 hover:bg-neutral-900/70"
									>
										<div className="flex items-start gap-2.5">
											<span
												className={cn(
													"mt-1.5 h-2 w-2 shrink-0 rounded-full",
													style.dot
												)}
											/>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium text-neutral-200">
													{component.label}
												</p>
												<p className={cn("mt-0.5 text-xs", style.text)}>
													{component.changes.join(" · ")}
												</p>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</aside>

				<div className="relative min-h-[500px] overflow-hidden rounded-xl border border-neutral-800 bg-[#cbc9c8]">
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
					</div>
					<GHFlowCanvas nodes={diff.nodes} edges={diff.edges} />
				</div>
			</div>
		</div>
	);
}
