import { GitBranch, List, Code } from "lucide-react";
import type { ViewMode } from "../types/type";

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
		<div className="mb-4 flex flex-wrap items-center gap-3">
			<button
				onClick={onCopyAll}
				className="rounded-lg border border-white px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 sm:px-6"
			>
				{isCopied ? "Copied!" : "Copy All as Markdown"}
			</button>
			<div className="flex rounded-lg border border-neutral-700 p-1">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						onClick={() => onSetViewMode(tab.key)}
						className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
							viewMode === tab.key
								? "bg-white text-black"
								: "text-neutral-400 hover:text-white"
						}`}
					>
						{tab.icon}
						{tab.label}
					</button>
				))}
			</div>
		</div>
	);
}
