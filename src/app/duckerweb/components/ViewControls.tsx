import { GitBranch, List, Code } from "lucide-react";
import type { ViewMode } from "../types/type";
import { cn } from "@/lib/utils";

interface ViewControlsProps {
	viewMode: ViewMode;
	isCopied: boolean;
	onCopyAll: () => void;
	onSetViewMode: (mode: ViewMode) => void;
}

const tabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
	{ key: "list", label: "List", icon: <List size={16} /> },
	{ key: "flow", label: "Flow", icon: <GitBranch size={16} /> },
	{ key: "json", label: "JSON", icon: <Code size={16} /> },
];

export function ViewControls({
	viewMode,
	isCopied,
	onCopyAll,
	onSetViewMode,
}: ViewControlsProps) {
	return (
		<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<button
				type="button"
				onClick={onCopyAll}
				className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
			>
				{isCopied ? "Copied!" : "Copy all as Markdown"}
			</button>

			<div
				className="inline-flex rounded-lg border border-neutral-800 bg-neutral-950 p-1"
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
							"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4",
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
