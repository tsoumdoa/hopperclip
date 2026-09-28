import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import type { GhPageFileDropLayerProps } from "@/types/gh-card";
import { detectGhFileKind } from "../utils/gh-file";
import { getFirstDroppedFile, isFileDragEvent } from "../utils/file-drag";

/**
 * Full-page drag target for importing Grasshopper `.gh` / `.ghx` files on the
 * main library view. Disabled while the add-card dialog is open so the
 * in-dialog dropzone keeps priority.
 */
export function GhPageFileDropLayer({
	enabled,
	onGhFileDrop,
	children,
}: GhPageFileDropLayerProps) {
	const [isDragging, setIsDragging] = useState(false);
	const dragCounter = useRef(0);

	useEffect(() => {
		if (!enabled) {
			dragCounter.current = 0;
			setIsDragging(false);
		}
	}, [enabled]);

	useEffect(() => {
		const handleDragEnter = (e: DragEvent) => {
			if (!enabled || !isFileDragEvent(e)) return;
			e.preventDefault();
			dragCounter.current += 1;
			setIsDragging(true);
		};

		const handleDragLeave = (e: DragEvent) => {
			if (!enabled) return;
			e.preventDefault();
			dragCounter.current = Math.max(0, dragCounter.current - 1);
			if (dragCounter.current === 0) {
				setIsDragging(false);
			}
		};

		const handleDragOver = (e: DragEvent) => {
			if (!enabled || !isFileDragEvent(e)) return;
			e.preventDefault();
		};

		const handleDrop = (e: DragEvent) => {
			if (!enabled || !isFileDragEvent(e)) return;
			e.preventDefault();
			dragCounter.current = 0;
			setIsDragging(false);

			const file = getFirstDroppedFile(e);
			if (!file) return;

			if (detectGhFileKind(file) === "unknown") {
				toast.error(
					`"${file.name}" is not supported. Drop a .gh or .ghx Grasshopper file.`
				);
				return;
			}

			onGhFileDrop(file);
		};

		window.addEventListener("dragenter", handleDragEnter);
		window.addEventListener("dragleave", handleDragLeave);
		window.addEventListener("dragover", handleDragOver);
		window.addEventListener("drop", handleDrop);

		return () => {
			window.removeEventListener("dragenter", handleDragEnter);
			window.removeEventListener("dragleave", handleDragLeave);
			window.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("drop", handleDrop);
		};
	}, [enabled, onGhFileDrop]);

	return (
		<>
			{children}
			{enabled && isDragging && (
				<div
					className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 p-4 backdrop-blur-md md:p-6"
					data-testid="gh-page-file-drop-overlay"
					aria-hidden
				>
					<div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-green-300/40 text-center">
						<div className="flex size-14 items-center justify-center rounded-full border border-green-300/30 bg-green-300/10">
							<FileUp className="size-7 text-green-300" />
						</div>
						<p className="text-lg font-semibold text-white">
							Drop to add a new card
						</p>
						<p className="text-sm text-neutral-400">
							.gh and .ghx files open in the new-card dialog
						</p>
					</div>
				</div>
			)}
		</>
	);
}
