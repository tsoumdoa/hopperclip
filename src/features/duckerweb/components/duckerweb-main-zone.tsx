import { FileUp } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DuckerwebMainZoneProps } from "../types/type";

function isFileDragEvent(event: React.DragEvent): boolean {
	return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * Wraps the DuckerWeb main view so that dragging a `.gh`/`.ghx` file anywhere
 * over the content area activates a full-zone drop overlay. Scoped to this
 * container only — no window-level listeners — so other drop targets (e.g.
 * AddGhDialog) are unaffected.
 */
export function DuckerwebMainZone({
	children,
	onFileSelected,
	className,
	dropTitle = "Drop .gh or .ghx file to import",
}: DuckerwebMainZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const dragDepth = useRef(0);

	const resetDragState = useCallback(() => {
		dragDepth.current = 0;
		setIsDragging(false);
	}, []);

	const handleDragEnter = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (!isFileDragEvent(event)) return;
			event.preventDefault();
			dragDepth.current += 1;
			setIsDragging(true);
		},
		[]
	);

	const handleDragLeave = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (!isFileDragEvent(event)) return;
			event.preventDefault();
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) {
				setIsDragging(false);
			}
		},
		[]
	);

	const handleDragOver = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (!isFileDragEvent(event)) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
		},
		[]
	);

	const handleDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (!isFileDragEvent(event)) return;
			event.preventDefault();
			event.stopPropagation();
			resetDragState();

			const files = event.dataTransfer.files;
			if (files.length > 0) {
				onFileSelected(files[0]);
			}
		},
		[onFileSelected, resetDragState]
	);

	return (
		<div
			className={cn("relative", className)}
			data-testid="duckerweb-main-zone"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			{children}

			{isDragging && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 p-4 backdrop-blur-md md:p-6"
					aria-hidden
					data-testid="duckerweb-drop-overlay"
				>
					<div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-emerald-500/40">
						<div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
							<FileUp className="h-7 w-7 text-emerald-300" />
						</div>
						<p className="text-lg font-semibold text-neutral-100">
							{dropTitle}
						</p>
						<p className="text-sm text-neutral-400">
							Release anywhere in this view
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
