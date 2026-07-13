import { cn } from "@/lib/utils";
import type { Edge } from "@xyflow/react";
import type { FlowNode } from "../duckerweb/types/type";
import { GHFlowCanvas } from "../duckerweb/components/GHFlowCanvas";

export function GhFlowView(props: {
	nodes: FlowNode[];
	edges: Edge[];
	loading?: boolean;
	emptyMessage?: string;
	className?: string;
}) {
	return (
		<div className={cn("h-full min-h-0", props.className)}>
			{props.loading ? (
				<div className="flex h-full items-center justify-center">
					<span className="text-neutral-400">Loading flow...</span>
				</div>
			) : props.nodes.length > 0 ? (
				<GHFlowCanvas nodes={props.nodes} edges={props.edges} />
			) : (
				<div className="flex h-full items-center justify-center px-6 text-center">
					<span className="text-neutral-500">
						{props.emptyMessage ?? "No flow data available"}
					</span>
				</div>
			)}
		</div>
	);
}
