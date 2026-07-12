"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GHFlowCanvas } from "../duckerweb/components/GHFlowCanvas";
import type { ScriptMetrics } from "../hooks/use-script-metrics";
import type { GHNode } from "../duckerweb/types/type";
import type { Edge } from "@xyflow/react";

export function MetricsDialog(props: {
	open: boolean;
	setOpen: (open: boolean) => void;
	metrics: ScriptMetrics | null;
	nodes: GHNode[];
	edges: Edge[];
	loading: boolean;
	error?: string | null;
}) {
	return (
		<Dialog open={props.open} onOpenChange={props.setOpen}>
			<DialogContent
				className="flex max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 p-0"
				onPointerDownOutside={(e) => e.preventDefault()}
			>
				<DialogHeader className="flex flex-row items-center justify-between border-neutral-700 px-6 py-4">
					<DialogTitle>Script Metrics</DialogTitle>
				</DialogHeader>

				{props.error && (
					<div className="mx-6 mb-2 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800">
						{props.error}
					</div>
				)}

				<Tabs defaultValue="metrics" className="flex-1 overflow-hidden">
					<div className="border-neutral-700 pl-4">
						<TabsList>
							<TabsTrigger value="flow">Flow View</TabsTrigger>
							<TabsTrigger value="metrics">Metrics</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent
						value="metrics"
						className="mt-0 overflow-y-auto px-6 py-4"
					>
						{props.loading ? (
							<div className="flex items-center justify-center py-8">
								<span className="text-neutral-400">Loading metrics...</span>
							</div>
						) : props.metrics ? (
							<div className="space-y-4 py-2">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1">
										<div className="text-xs text-neutral-500">
											Grasshopper Version
										</div>
										<div className="font-semibold text-neutral-800">
											{props.metrics.GhVersion}
										</div>
									</div>
									<div className="space-y-1">
										<div className="text-xs text-neutral-500">
											Total Components
										</div>
										<div className="font-semibold text-neutral-800">
											{props.metrics.componentsCount}
										</div>
									</div>
									<div className="space-y-1">
										<div className="text-xs text-neutral-500">
											Unique Components
										</div>
										<div className="font-semibold text-neutral-800">
											{props.metrics.uniqueCount}
										</div>
									</div>
									<div className="space-y-1">
										<div className="text-xs text-neutral-500">
											Plugin Libraries
										</div>
										<div className="font-semibold text-neutral-800">
											{props.metrics.ghLibs?.length ?? 0}
										</div>
									</div>
								</div>
								{(props.metrics.ghLibs?.length ?? 0) > 0 && (
									<div className="space-y-2">
										<div className="text-xs text-neutral-500">
											Plugin Libraries
										</div>
										<div className="max-h-48 space-y-1 overflow-y-auto rounded-md bg-neutral-900 p-3">
											{props.metrics.ghLibs?.map((lib, index) => (
												<div
													key={index}
													className="flex items-center justify-between border-b border-neutral-800 pb-2 last:border-0 last:pb-0"
												>
													<div>
														<div className="font-medium text-neutral-100">
															{lib.name}
														</div>
														<div className="text-xs text-neutral-400">
															{lib.author}
														</div>
													</div>
													<div className="text-xs text-neutral-500">
														{lib.version}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="py-8 text-neutral-400">No metrics available</div>
						)}
					</TabsContent>

					<TabsContent
						value="flow"
						className="mt-0 h-[70vh] min-h-0 flex-none p-4"
					>
						{props.loading ? (
							<div className="flex h-full items-center justify-center">
								<span className="text-neutral-400">Loading flow...</span>
							</div>
						) : props.nodes.length > 0 ? (
							<GHFlowCanvas nodes={props.nodes} edges={props.edges} />
						) : (
							<div className="flex h-full items-center justify-center">
								<span className="text-neutral-400">No flow data available</span>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
