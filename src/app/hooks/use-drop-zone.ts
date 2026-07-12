import { useCallback, useEffect, useRef, useState } from "react";
import { getFirstDroppedFile, isFileDragEvent } from "../utils/file-drag";

/**
 * Reusable drag-and-drop hook for accepting file drops on any element.
 *
 * Mirrors the drag-depth-counter pattern used by DuckerWeb's `DuckerwebMainZone`
 * so nested `dragenter`/`dragleave` events (caused by child elements) don't
 * cause flickering. All handlers call `stopPropagation()` so container-level
 * drop zones take priority over window-level listeners (e.g. the page-wide
 * `GhPageFileDropLayer`).
 *
 * @param onDrop  Called with the first dropped File. Uses a ref so the
 *                callback always reflects the latest closure without
 *                forcing `dragHandlers` to change identity each render.
 * @param enabled When false, all handlers become no-ops and `isDragging`
 *                resets to false. Useful for conditionally activating the
 *                drop zone (e.g. only during card edit mode).
 */
export function useDropZone(
	onDrop: (file: File) => void,
	enabled: boolean = true
) {
	const [isDragging, setIsDragging] = useState(false);
	const dragDepth = useRef(0);
	const onDropRef = useRef(onDrop);

	useEffect(() => {
		onDropRef.current = onDrop;
	}, [onDrop]);

	useEffect(() => {
		if (!enabled) {
			dragDepth.current = 0;
			setIsDragging(false);
		}
	}, [enabled]);

	const handleDragEnter = useCallback(
		(event: React.DragEvent) => {
			if (!enabled || !isFileDragEvent(event)) return;
			event.preventDefault();
			event.stopPropagation();
			dragDepth.current += 1;
			setIsDragging(true);
		},
		[enabled]
	);

	const handleDragLeave = useCallback(
		(event: React.DragEvent) => {
			if (!enabled || !isFileDragEvent(event)) return;
			event.preventDefault();
			event.stopPropagation();
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) {
				setIsDragging(false);
			}
		},
		[enabled]
	);

	const handleDragOver = useCallback(
		(event: React.DragEvent) => {
			if (!enabled || !isFileDragEvent(event)) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = "copy";
		},
		[enabled]
	);

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			if (!enabled || !isFileDragEvent(event)) return;
			event.preventDefault();
			event.stopPropagation();
			dragDepth.current = 0;
			setIsDragging(false);
			const file = getFirstDroppedFile(event);
			if (file) onDropRef.current(file);
		},
		[enabled]
	);

	return {
		isDragging,
		dragHandlers: {
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDragOver: handleDragOver,
			onDrop: handleDrop,
		},
	};
}
