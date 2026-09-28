import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GhFlowView } from "./gh-flow-view";
import type { ScriptMetrics } from "../hooks/use-script-metrics";
import type { GHNode } from "../duckerweb/types/type";
import type { Edge } from "@xyflow/react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricsDialog(props: {
	title?: string;
	open: boolean;
	setOpen: (open: boolean) => void;
	metrics: ScriptMetrics | null;
	nodes: GHNode[];
	edges: Edge[];
	loading: boolean;
	error?: string | null;
}) {
	const [detailsOpen, setDetailsOpen] = useState(true);

	useEffect(() => {
		if (props.open) {
			setDetailsOpen(window.matchMedia("(min-width: 1024px)").matches);
		}
	}, [props.open]);

	const ToggleIcon = detailsOpen ? PanelRightClose : PanelRightOpen;

	return (
		<Dialog open={props.open} onOpenChange={props.setOpen}>
			<DialogContent
				className="flex h-[88vh] w-[94vw] max-w-[94vw] flex-col gap-0 overflow-hidden p-0 xl:max-w-7xl"
				onPointerDownOutside={(e) => e.preventDefault()}
			>
				<DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-white/[0.06] py-3 pr-14 pl-5">
					<DialogTitle className="min-w-0 truncate text-base">
						{props.title ?? "Script"}
					</DialogTitle>
					<button
						type="button"
						onClick={() => setDetailsOpen((open) => !open)}
						aria-pressed={detailsOpen}
						className={cn(
							"ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
							detailsOpen
								? "bg-white/[0.07] text-white"
								: "text-neutral-400 hover:bg-white/5 hover:text-white"
						)}
					>
						<ToggleIcon className="size-4" aria-hidden />
						Details
					</button>
				</DialogHeader>

				<div className="relative flex min-h-0 flex-1">
					<div className="min-w-0 flex-1 p-3">
						<GhFlowView
							nodes={props.nodes}
							edges={props.edges}
							loading={props.loading}
							errorMessage={props.error ?? undefined}
						/>
					</div>

					{detailsOpen && (
						<aside
							aria-label="Script details"
							className="bg-popover absolute inset-y-0 right-0 z-10 flex w-72 flex-col gap-6 overflow-y-auto border-l border-white/[0.06] p-5 shadow-2xl lg:static lg:shadow-none"
						>
							<ScriptDetails metrics={props.metrics} loading={props.loading} />
						</aside>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ScriptDetails(props: {
	metrics: ScriptMetrics | null;
	loading: boolean;
}) {
	if (props.loading) {
		return (
			<div
				className="grid grid-cols-2 gap-2"
				role="status"
				aria-label="Loading"
			>
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-[74px] rounded-lg bg-white/[0.05]" />
				))}
			</div>
		);
	}

	if (!props.metrics) {
		return <p className="text-sm text-neutral-500">No details available</p>;
	}

	const libs = props.metrics.ghLibs ?? [];
	const stats = [
		{ label: "Components", value: props.metrics.componentsCount },
		{ label: "Unique", value: props.metrics.uniqueCount },
		{ label: "Plugins", value: libs.length },
		{ label: "Grasshopper", value: props.metrics.GhVersion },
	];

	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
					>
						<div className="text-xs text-neutral-500">{stat.label}</div>
						<div
							className="mt-1 truncate text-xl font-semibold text-neutral-50 tabular-nums"
							title={String(stat.value)}
						>
							{stat.value}
						</div>
					</div>
				))}
			</div>

			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-neutral-400">
					Plugin libraries
				</h3>
				{libs.length > 0 ? (
					<ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06]">
						{libs.map((lib, index) => (
							<li key={index} className="px-3 py-2.5">
								<div className="flex items-baseline justify-between gap-3">
									<span className="truncate text-sm font-medium text-neutral-100">
										{lib.name}
									</span>
									<span className="shrink-0 font-mono text-[11px] text-neutral-500">
										{lib.version}
									</span>
								</div>
								{lib.author && (
									<div className="truncate text-xs text-neutral-500">
										{lib.author}
									</div>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-neutral-500">
						No plugin libraries referenced.
					</p>
				)}
			</section>
		</>
	);
}
