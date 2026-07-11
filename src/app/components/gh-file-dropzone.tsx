import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import type { GhFileDropzoneProps } from "@/types/gh-card";

/**
 * Drag-and-drop + file-picker component for accepting Grasshopper `.gh` or
 * `.ghx` files. Visual style intentionally matches the existing "Paste GhXml
 * from Clipboard" button so the two input methods feel like peers.
 *
 * Limitations:
 *   - Drag/drop requires the page to have focus. We deliberately don't
 *     listen at the window level — that interferes with existing drop
 *     targets (e.g. the AddGhDialog wrapper) and creates "drop anywhere
 *     hijacking" surprises.
 *   - Multi-file drops use only the first file. The user's intent in this
 *     UI is "import one definition", not "import a folder."
 */
export function GhFileDropzone({
	onFileSelected,
	disabled,
	className,
	idleLabel = "Drop .gh or .ghx file, or click to browse",
}: GhFileDropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const acceptFile = (file: File | null | undefined) => {
		if (!file) return;
		onFileSelected(file);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		if (disabled) return;
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		if (disabled) return;
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			acceptFile(files[0]);
		}
	};

	const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			acceptFile(files[0]);
		}
		// Reset so picking the same file twice still triggers onChange
		e.target.value = "";
	};

	return (
		<div className={className}>
			<div
				role="button"
				tabIndex={disabled ? -1 : 0}
				aria-disabled={disabled}
				onClick={() => !disabled && inputRef.current?.click()}
				onKeyDown={(e) => {
					if (disabled) return;
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						inputRef.current?.click();
					}
				}}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`animate flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border bg-neutral-100 p-2 font-medium shadow-xs transition-all ${
					isDragging
						? "border-blue-500 text-blue-600"
						: "border-input text-neutral-500 hover:text-neutral-700"
				} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
				data-testid="gh-file-dropzone"
			>
				<FileUp className="h-4 w-4" />
				<span className="text-sm">
					{isDragging ? "Drop .gh or .ghx here" : idleLabel}
				</span>
			</div>
			<input
				ref={inputRef}
				type="file"
				accept=".gh,.ghx,application/gzip,application/xml,application/octet-stream"
				onChange={handlePickerChange}
				className="hidden"
				disabled={disabled}
			/>
		</div>
	);
}
