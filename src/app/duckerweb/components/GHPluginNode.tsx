import type { NodeProps, NodeTypes } from "@xyflow/react";
import { Puzzle } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GHNode } from "../types/type";

export function withPluginHint(
	NodeComponent: NodeTypes[string]
): NodeTypes[string] {
	return function GHPluginNode(props: NodeProps<GHNode>) {
		const library = props.data.library;
		const name = library?.replace(/ v[\d.]+$/, "");
		// The library table can also contain Grasshopper itself.
		if (!name || name === "Grasshopper") {
			return <NodeComponent {...props} />;
		}

		return (
			<div className="relative h-full w-full" data-plugin-library={library}>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -inset-0.5 rounded border border-[#827296]/60"
				/>
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							tabIndex={0}
							aria-label={`Plugin: ${library}`}
							className="nodrag nopan absolute bottom-[calc(100%+5px)] left-1/2 z-10 flex max-w-36 -translate-x-1/2 items-center gap-1 rounded border border-[#a99ab7]/60 bg-[#e8e2ee]/95 px-1 py-0.5 text-[9px] leading-none text-[#655473] shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-[#827296]"
						>
							<Puzzle size={9} className="shrink-0" aria-hidden="true" />
							<span className="truncate">{name}</span>
						</span>
					</TooltipTrigger>
					<TooltipContent side="top" align="center" className="text-center">
						Plugin: {library}
					</TooltipContent>
				</Tooltip>
				<NodeComponent {...props} />
			</div>
		);
	};
}
