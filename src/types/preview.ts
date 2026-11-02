export const PREVIEW_VERSION = 1;
export const PREVIEW_CAPS = {
	nodes: 400,
	edges: 800,
	groups: 30,
	keyComponents: 4,
	scripts: 3,
	plugins: 3,
	nameLength: 40,
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
	plugins: string[];
	// Packed [x, y, width, height, kind] and [source index, target index].
	nodes: number[];
	edges: number[];
	groups: Array<{ x: number; y: number; w: number; h: number; color: string }>;
};
