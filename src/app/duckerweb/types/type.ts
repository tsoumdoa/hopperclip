import type { Node, Edge, Position } from "@xyflow/react";
import type { ParsedGrasshopper, PortOptions } from "parser/src/types";
import type { CSSProperties, ReactNode } from "react";
import type { GHRuntimeState } from "../lib/runtime-palette";

export type GHNodeType =
	| "value"
	| "panel"
	| "component"
	| "script"
	| "slider"
	| "valueList"
	| "toggle"
	| "swatch"
	| "button"
	| "group"
	| "relay";

export type GHNodeData = {
	label: string;
	type: GHNodeType;
	inputs: Port[];
	outputs: Port[];
	accentColor?: string;
	selected?: boolean;
	runtimeState?: GHRuntimeState;
	members?: string[];
	containerBounds?: Bounds;
	groupColor?: string;
	value?: string;
	percent?: number;
	height?: number;
	inputWidth?: number;
	outputWidth?: number;
	usesGrasshopperBounds?: boolean;
} & Record<string, unknown>;

export type GHNode = Node<GHNodeData>;

export type Port = {
	id: string;
	label: string;
	options?: PortOptions;
	position?: number;
};

export type Bounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type ParsedComponent = {
	id: string;
	type: string;
	nickName: string;
	description?: string;
	library?: string;
	inputs: Record<string, { nick: string; description?: string }>;
	outputs: Record<string, { nick: string; description?: string }>;
};

export type ViewMode = "list" | "flow" | "diff" | "json";

export type GHDiffStatus = "added" | "modified" | "removed" | "unchanged";

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

export type GHFlowCanvasFocus = {
	nodeId: string;
	nonce: number;
};

export type GHFlowCanvasProps = {
	nodes: GHNode[];
	edges: Edge[];
	focus?: GHFlowCanvasFocus | null;
};

export type ScriptData = {
	language?: string;
	code: string;
	title?: string;
};

export type GHNodeProps = {
	data: {
		label: string;
		type: string;
		inputs: Port[];
		outputs: Port[];
		accentColor?: string;
		selected?: boolean;
		runtimeState?: GHRuntimeState;
		inputWidth?: number;
		outputWidth?: number;
		value?: string;
		height?: number;
		script?: ScriptData;
		usesGrasshopperBounds?: boolean;
	};
	selected?: boolean;
};

export type GHGroupNodeProps = {
	data: {
		label: string;
		type: string;
		members?: string[];
		containerBounds?: Bounds;
		groupColor?: string;
		accentColor?: string;
		selected?: boolean;
	};
	selected?: boolean;
};

export type GHSliderNodeProps = {
	data: {
		label: string;
		type: string;
		inputs: Port[];
		outputs: Port[];
		accentColor?: string;
		selected?: boolean;
		value?: string;
		percent?: number;
		usesGrasshopperBounds?: boolean;
	};
	selected?: boolean;
};

export type GHValueListItem = {
	name: string;
	expression: string | number;
	selected: boolean;
};

export type GHValueListNodeProps = {
	data: {
		label: string;
		type: string;
		inputs: Port[];
		outputs: Port[];
		accentColor?: string;
		selected?: boolean;
		value?: string;
		items?: GHValueListItem[];
		selectedIndex?: number;
		usesGrasshopperBounds?: boolean;
	};
	selected?: boolean;
};

export type GHToggleNodeProps = {
	data: {
		label: string;
		type: string;
		inputs: Port[];
		outputs: Port[];
		accentColor?: string;
		selected?: boolean;
		value?: string;
		usesGrasshopperBounds?: boolean;
	};
	selected?: boolean;
};

export type GHSwatchNodeProps = {
	data: {
		label: string;
		type: string;
		inputs: Port[];
		outputs: Port[];
		accentColor?: string;
		selected?: boolean;
		value?: string;
		color?: string;
		outputWidth?: number;
		usesGrasshopperBounds?: boolean;
	};
	selected?: boolean;
};

export type GHButtonNodeProps = {
	data: {
		label: string;
		type: string;
		inputs: Port[];
		outputs: Port[];
		accentColor?: string;
		selected?: boolean;
		usesGrasshopperBounds?: boolean;
	};
	selected?: boolean;
};

export type GHEdgeProps = {
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	sourcePosition: Position;
	targetPosition: Position;
	selected?: boolean;
	style?: CSSProperties;
	data?: {
		wireStyle?: "normal" | "faint" | "hidden";
		isRevealed?: boolean;
	};
};

export type HandleVariant = "detailed" | "compact";
export type HandleSide = "left" | "right";
export type HandlePortType = "source" | "target";

export type GHHandleProps = {
	variant: HandleVariant;
	position: HandleSide;
	type: HandlePortType;
	id?: string;
	className?: string;
	detached?: boolean;
};

export type GHHandlePositionProps = {
	position: HandleSide;
	children: ReactNode;
	className?: string;
	top?: string;
};
