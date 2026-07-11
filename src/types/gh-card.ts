import type { ReactNode } from "react";

export type OpenAddDialogEventDetail = {
	file?: File;
};

export type AddDialogStateEventDetail = {
	open: boolean;
};

export type AddGhDialogProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	adding: boolean;
	setAdding: (adding: boolean) => void;
	initialFile?: File | null;
	onInitialFileConsumed?: () => void;
};

export type GhPageFileDropLayerProps = {
	enabled: boolean;
	onGhFileDrop: (file: File) => void;
	children: ReactNode;
};

export type GhFileDropzoneProps = {
	/**
	 * Called with the dropped/picked File. The parent is responsible for
	 * actually decoding it (via ghFileToGhXml) and feeding the resulting
	 * GhXml into the same validation path as clipboard paste.
	 */
	onFileSelected: (file: File) => void;
	disabled?: boolean;
	className?: string;
	idleLabel?: string;
};

export type GhCardXmlPasteProps = {
	xmlData: string | undefined;
	setXmlData: (data: string | undefined) => void;
	isValidXml: boolean;
	xmlError: string;
	setXmlError: (error: string) => void;
	handlePasteFromClipboard: () => void;
	handleFileSelected: (file: File) => void;
	onClearPastedXml?: () => void;
	isEditMode?: boolean;
};

export type IngestResult = {
	isValid: boolean;
	xml?: string;
	errorMsg?: string;
};

export type UseXmlPasteHandlerOptions = {
	onSingleScriptComponent?: (nickName: string) => void;
};
