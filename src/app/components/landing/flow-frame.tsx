import { ReactFlowProvider } from "@xyflow/react";
import { GHFlowCanvas } from "@/app/duckerweb/components/GHFlowCanvas";
import { cn } from "@/lib/utils";
import type { SampleFlow } from "./use-sample-flow";

/**
 * Renders the real DuckerWeb flow canvas inside a "browser window" frame,
 * for use as a hero/showpiece on landing pages.
 */
export function FlowFrame({
	sample,
	className,
}: {
	sample: SampleFlow;
	className?: string;
}) {
	if (!sample) return null;
	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60",
				className
			)}
		>
			<div className="flex items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
				<span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
				<span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
				<span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
				<span className="ml-3 truncate font-mono text-[11px] text-neutral-500">
					hopperclip.app/c/sample
				</span>
			</div>
			<div className="h-full w-full">
				<ReactFlowProvider>
					<GHFlowCanvas nodes={sample.nodes} edges={sample.edges} />
				</ReactFlowProvider>
			</div>
		</div>
	);
}
