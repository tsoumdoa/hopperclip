type FileDragEvent = {
	dataTransfer: Pick<DataTransfer, "types" | "files"> | null;
};

export function isFileDragEvent(event: FileDragEvent): boolean {
	return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function getFirstDroppedFile(event: FileDragEvent): File | null {
	return event.dataTransfer?.files[0] ?? null;
}
