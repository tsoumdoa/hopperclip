import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GhFlowView } from "./gh-flow-view";
import type { ScriptMetrics } from "../hooks/use-script-metrics";
import type { GHNode } from "../duckerweb/types/type";
import type { Edge } from "@xyflow/react";
import { Loader2 } from "lucide-react";

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
	const stats = props.metrics
		? [
				{ label: "Components", value: props.metrics.componentsCount },
				{ label: "Unique components", value: props.metrics.uniqueCount },
				{ label: "Plugins", value: props.metrics.ghLibs?.length ?? 0 },
				{ label: "Grasshopper", value: props.metrics.GhVersion },
			]
		: [];

	return (
		<Dialog open={props.open} onOpenChange={props.setOpen}>
			<DialogContent
				className="flex max-h-[92vh] w-[94vw] max-w-[94vw] flex-col gap-0 overflow-hidden p-0 xl:max-w-7xl"
				onPointerDownOutside={(e) => e.preventDefault()}
			>
				<Tabs defaultValue="flow" className="min-h-0 flex-1 gap-0">
					<DialogHeader className="flex flex-row items-center gap-4 space-y-0 border-b border-white/[0.06] py-3 pr-14 pl-5">
						<DialogTitle className="min-w-0 truncate text-base">
							{props.title ?? "Script"}
						</DialogTitle>
						<TabsList className="ml-auto">
							<TabsTrigger value="flow">Graph</TabsTrigger>
							<TabsTrigger value="metrics">Details</TabsTrigger>
						</TabsList>
					</DialogHeader>

					{props.error && (
						<div className="mx-5 mt-4 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-300">
							{props.error}
						</div>
					)}

					<TabsContent value="metrics" className="mt-0 overflow-y-auto p-5">
						{props.loading ? (
							<div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
								<Loader2 className="size-4 animate-spin" aria-hidden />
								Loading details…
							</div>
						) : props.metrics ? (
							<div className="space-y-6">
								<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
									{stats.map((stat) => (
										<div
											key={stat.label}
											className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
										>
											<div className="text-xs text-neutral-500">
												{stat.label}
											</div>
											<div className="mt-1 truncate text-2xl font-semibold text-neutral-50 tabular-nums">
												{stat.value}
											</div>
										</div>
									))}
								</div>
								{(props.metrics.ghLibs?.length ?? 0) > 0 && (
									<div className="space-y-2">
										<div className="text-xs font-medium text-neutral-400">
											Plugin libraries
										</div>
										<div className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06]">
											{props.metrics.ghLibs?.map((lib, index) => (
												<div
													key={index}
													className="flex items-center justify-between gap-4 px-4 py-3"
												>
													<div className="min-w-0">
														<div className="truncate font-medium text-neutral-100">
															{lib.name}
														</div>
														<div className="truncate text-xs text-neutral-500">
															{lib.author}
														</div>
													</div>
													<div className="shrink-0 font-mono text-xs text-neutral-500">
														{lib.version}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="py-12 text-center text-sm text-neutral-500">
								No details available
							</div>
						)}
					</TabsContent>

					<TabsContent
						value="flow"
						className="mt-0 h-[76vh] min-h-0 flex-none p-3"
					>
						<GhFlowView
							nodes={props.nodes}
							edges={props.edges}
							loading={props.loading}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
