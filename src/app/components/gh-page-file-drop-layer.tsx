"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import type { GhPageFileDropLayerProps } from "@/types/gh-card";
import { detectGhFileKind } from "../utils/gh-file";

export function isFileDragEvent(
	e: Pick<DragEvent, "dataTransfer">
): boolean {
	return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

export function getFirstDroppedFile(e: DragEvent): File | null {
	const files = e.dataTransfer?.files;
	if (!files || files.length === 0) return null;
	return files[0] ?? null;
}

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
			if (!enabled) return;
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
					className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
					data-testid="gh-page-file-drop-overlay"
					aria-hidden
				>
					<div className="flex max-w-lg flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-400 bg-neutral-900/90 px-8 py-10 text-center shadow-2xl">
						<FileUp className="h-10 w-10 text-blue-400" />
						<p className="text-xl font-semibold text-white">
							Drop .gh or .ghx file to add a card
						</p>
						<p className="text-sm text-neutral-400">
							Grasshopper definition files will open in the add-card dialog.
						</p>
					</div>
				</div>
			)}
		</>
	);
}
