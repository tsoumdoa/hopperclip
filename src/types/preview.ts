export const PREVIEW_VERSION = 3;
export const PREVIEW_CAPS = {
	nodes: 400,
	edges: 800,
	groups: 30,
	keyComponents: 4,
	scripts: 3,
	plugins: 3,
	nameLength: 40,
	signatureScripts: 3,
	signaturePorts: 4,
} as const;

// Stored node kind indices are part of the versioned digest format.
export const PREVIEW_KINDS = [
	"component",
	"param",
	"input",
	"script",
	"panel",
	"plugin",
] as const;
export type PreviewKind = (typeof PREVIEW_KINDS)[number];

export type PreviewData = {
	count: number;
	inputs: { sliders: number; toggles: number; lists: number };
	keyComponents: string[];
	scripts: string[];
	scriptCount: number;
	plugins: string[];
	pluginCount: number;
	// Packed [x, y, width, height, kind] and [source index, target index].
	nodes: number[];
	edges: number[];
	groups: Array<{ x: number; y: number; w: number; h: number; color: string }>;
	// Port names of the main script when the clip is essentially just scripts.
	signature?: PreviewSignature;
};

export type PreviewSignature = {
	// 0 plain, 1 input, 2 panel, 3 param; optional for older digests.
	inputKinds?: number[];
	outputKinds?: number[];
	language: string;
	inputs: string[];
	inputCount: number;
	outputs: string[];
	outputCount: number;
};
