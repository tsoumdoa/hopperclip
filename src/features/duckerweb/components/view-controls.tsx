import { GitBranch, GitCompareArrows, List, Code } from "lucide-react";
import type { ViewControlsProps, ViewTab } from "../types/type";
import { cn } from "@/lib/utils";

const tabs: ViewTab[] = [
	{ key: "flow", label: "Flow", icon: <GitBranch size={16} /> },
	{ key: "diff", label: "Diff", icon: <GitCompareArrows size={16} /> },
	{ key: "list", label: "List", icon: <List size={16} /> },
	{ key: "json", label: "JSON", icon: <Code size={16} /> },
];

export function ViewControls({
	viewMode,
	isCopied,
	onCopyAll,
	onSetViewMode,
}: ViewControlsProps) {
	return (
		<div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 lg:basis-auto lg:justify-end">
			<button
				type="button"
				onClick={onCopyAll}
				className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium whitespace-nowrap text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
			>
				{isCopied
					? "Copied!"
					: viewMode === "diff"
						? "Copy original as Markdown"
						: "Copy all as Markdown"}
			</button>

			<div
				className="ml-auto inline-flex max-w-full overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-1"
				role="tablist"
				aria-label="View mode"
			>
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={viewMode === tab.key}
						onClick={() => onSetViewMode(tab.key)}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
							viewMode === tab.key
								? "bg-neutral-200 text-black"
								: "text-neutral-400 hover:text-neutral-200"
						)}
					>
						{tab.icon}
						{tab.label}
					</button>
				))}
			</div>
		</div>
	);
}
