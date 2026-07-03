"use client";
import { useEffect, useState } from "react";

export function ShortcutHint() {
	const [isMac, setIsMac] = useState(false);
	useEffect(() => {
		if (typeof window !== "undefined") {
			setIsMac(window.navigator.userAgent.includes("Mac"));
		}
	}, []);

	const mod = isMac ? "⌘" : "Ctrl";
	return (
		<div className="fixed right-4 bottom-4 hidden items-center gap-2 rounded-lg border border-neutral-700/50 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-500 shadow-lg backdrop-blur-sm sm:flex">
			<span className="flex items-center gap-1.5">
				<span className="flex items-center gap-0.5">
					<kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-neutral-600 bg-neutral-800 px-1.5 font-mono text-[11px] font-medium text-neutral-300 select-none">
						{mod}
					</kbd>
					<kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-neutral-600 bg-neutral-800 px-1.5 font-mono text-[11px] font-medium text-neutral-300 select-none">
						K
					</kbd>
				</span>
				<span>Filter</span>
			</span>
			<span className="text-neutral-700">|</span>
			<span className="flex items-center gap-1.5">
				<span className="flex items-center gap-0.5">
					<kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-neutral-600 bg-neutral-800 px-1.5 font-mono text-[11px] font-medium text-neutral-300 select-none">
						{mod}
					</kbd>
					<kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-neutral-600 bg-neutral-800 px-1.5 font-mono text-[11px] font-medium text-neutral-300 select-none">
						⇧
					</kbd>
					<kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-neutral-600 bg-neutral-800 px-1.5 font-mono text-[11px] font-medium text-neutral-300 select-none">
						A
					</kbd>
				</span>
				<span>Add</span>
			</span>
		</div>
	);
}
