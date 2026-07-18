import type { ReactNode } from "react";

export type AddGhDialogProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	adding: boolean;
	setAdding: (adding: boolean) => void;
	initialFile?: File | null;
	onInitialFileConsumed?: () => void;
	initialXml?: string | null;
	onInitialXmlConsumed?: () => void;
};

export type GhPageFileDropLayerProps = {
	enabled: boolean;
	onGhFileDrop: (file: File) => void;
	children: ReactNode;
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
	pasteShortcutEnabled?: boolean;
};

export type IngestResult = {
	isValid: boolean;
	xml?: string;
	errorMsg?: string;
};

export type UseXmlPasteHandlerOptions = {
	onSingleScriptComponent?: (nickName: string) => void;
	onFilePicked?: (name: string) => void;
};
