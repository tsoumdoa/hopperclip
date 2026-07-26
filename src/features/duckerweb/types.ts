import type { Edge } from "@xyflow/react";
import type { ParsedGrasshopper } from "parser/src/types";
import type { ReactNode } from "react";
import type { GHNode } from "@/features/gh-flow/types";

/**
 * DuckerWeb's own view tabs. Share declares a narrower union of its own — it
 * only ever renders "list" and "flow".
 */
export type ViewMode = "list" | "flow" | "diff" | "json";

export type ParsedComponent = {
	id: string;
	type: string;
	nickName: string;
	description?: string;
	library?: string;
	inputs: Record<string, { nick: string; description?: string }>;
	outputs: Record<string, { nick: string; description?: string }>;
};

export type GHDiffStatus = "added" | "modified" | "removed" | "unchanged";

export type GHDiffMatchMode = "instance" | "type";

export type GHComponentDiff = {
	key: string;
	label: string;
	type: string;
	status: GHDiffStatus;
	changes: string[];
	layoutMoved: boolean;
};

export type GHDiffResult = {
	components: GHComponentDiff[];
	counts: Record<GHDiffStatus, number>;
	layoutMoves: number;
	addedWires: number;
	removedWires: number;
	nodes: GHNode[];
	edges: Edge[];
	matchMode: GHDiffMatchMode;
};

export type DuckerwebState = {
	xmlData: string | undefined;
	isValidXml: boolean;
	xmlError: string;
	parsedData: ParsedGrasshopper | null;
	viewMode: ViewMode;
	nodes: GHNode[];
	edges: Edge[];
	error: string;
	comparisonData: ParsedGrasshopper | null;
	diffResult: GHDiffResult | null;
	diffError: string;
	fileName: string;
	comparisonFileName: string;
	comparisonRejected: boolean;
	matchByTypeGuid: boolean;
	diffNotice: string;
};

export type DuckerwebImportResult =
	| {
			ok: true;
			parsedData: ParsedGrasshopper;
			nodes: GHNode[];
			edges: Edge[];
	  }
	| { ok: false; error: string };

export type DuckerwebMainZoneProps = {
	children: ReactNode;
	onFileSelected: (file: File) => void;
	className?: string;
	dropTitle?: string;
};

export type XmlPasteAreaProps = {
	xmlData: string | undefined;
	isValidXml: boolean;
	xmlError: string;
	fileName?: string;
	compact?: boolean;
	onPaste: () => void;
	onFileSelected: (file: File) => void;
	onClear: () => void;
};

export type ViewControlsProps = {
	viewMode: ViewMode;
	isCopied: boolean;
	onCopyAll: () => void;
	onSetViewMode: (mode: ViewMode) => void;
};

export type ViewTab = {
	key: ViewMode;
	label: string;
	icon: ReactNode;
};
