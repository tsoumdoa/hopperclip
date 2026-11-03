import type { PreviewData, PreviewKind } from "@/types/preview";
import { PREVIEW_KINDS } from "@/types/preview";

/**
 * Static card-preview digests for the landing page mocks. Same shape the
 * library stores per card, so the LP renders the real ThumbnailPreview.
 */

// Digest of public/samples/Attractor_Perforated_Facade_12x7.ghx (the
// DuckerWeb sample), generated with buildPreview. Key names hand-picked.
const facade: PreviewData = {
	count: 41,
	inputs: { sliders: 8, toggles: 0, lists: 0 },
	keyComponents: ["Region Difference", "Remap Numbers"],
	scripts: ["Python 3", "C#"],
	scriptCount: 2,
	plugins: [],
	pluginCount: 0,
	nodes: [
		121, 36, 13, 40, 0, 77, 71, 13, 22, 0, 77, 102, 13, 23, 0, 164, 60, 13, 34,
		0, 211, 66, 13, 24, 0, 258, 101, 13, 28, 0, 306, 61, 13, 37, 0, 365, 77, 13,
		24, 0, 417, 154, 14, 36, 0, 467, 95, 13, 46, 0, 507, 95, 13, 44, 0, 547,
		135, 13, 26, 0, 575, 190, 13, 31, 0, 599, 120, 13, 39, 0, 639, 87, 13, 37,
		0, 684, 38, 15, 28, 0, 684, 116, 15, 32, 0, 727, 34, 13, 35, 0, 727, 112,
		13, 39, 0, 767, 80, 13, 38, 0, 812, 80, 13, 38, 0, 902, 151, 13, 19, 0, 911,
		71, 10, 32, 0, 24, 94, 18, 11, 4, 7, 72, 52, 5, 2, 7, 120, 53, 5, 2, 218,
		151, 44, 5, 2, 218, 170, 40, 5, 2, 364, 170, 49, 5, 2, 364, 193, 55, 5, 2,
		513, 196, 52, 5, 2, 513, 219, 54, 5, 2, 856, 160, 38, 5, 2, 957, 160, 40,
		17, 4, 0, 0, 159, 17, 1, 857, 173, 13, 44, 0, 909, 226, 13, 10, 0, 266, 300,
		22, 36, 3, 403, 303, 22, 30, 3, 324, 321, 61, 19, 4, 461, 321, 61, 19, 4,
	],
	edges: [
		23, 1, 24, 1, 23, 2, 25, 2, 0, 3, 1, 3, 2, 3, 1, 4, 2, 4, 4, 5, 26, 5, 27,
		5, 3, 6, 5, 6, 6, 7, 28, 8, 29, 8, 7, 9, 8, 9, 9, 10, 10, 11, 31, 12, 30,
		12, 10, 13, 11, 13, 12, 13, 6, 14, 7, 14, 13, 14, 6, 15, 14, 16, 15, 17, 16,
		18, 17, 19, 18, 19, 19, 20, 35, 21, 20, 22, 32, 22, 21, 33, 20, 35, 20, 36,
		26, 37, 27, 37, 26, 38, 27, 38, 37, 39, 38, 40,
	],
	groups: [
		{ x: 5, y: 34, w: 175, h: 93, color: "#508fbe" },
		{ x: 209, y: 59, w: 113, h: 118, color: "#61a697" },
		{ x: 362, y: 75, w: 121, h: 126, color: "#b5995a" },
		{ x: 505, y: 93, w: 110, h: 133, color: "#a37bb4" },
		{ x: 637, y: 32, w: 191, h: 122, color: "#bc8065" },
		{ x: 853, y: 69, w: 147, h: 170, color: "#77a06e" },
		{ x: 263, y: 298, w: 262, h: 44, color: "#6695c0" },
	],
};

type SketchNode = [col: number, row: number, kind: PreviewKind];

const NODE_SIZE: Record<PreviewKind, [w: number, h: number]> = {
	component: [14, 32],
	param: [14, 12],
	input: [46, 6],
	script: [22, 36],
	panel: [40, 18],
	plugin: [16, 30],
};

/** Lay out a small hand-drawn graph on a column grid. */
function sketch(
	spec: Omit<PreviewData, "nodes" | "edges" | "groups" | "count"> & {
		nodes: SketchNode[];
		edges: Array<[number, number]>;
		groups?: Array<{ members: number[]; color: string }>;
	}
): PreviewData {
	const boxes = spec.nodes.map(([col, row, kind]) => {
		const [w, h] = NODE_SIZE[kind];
		return { x: col * 56, y: row * 44, w, h, kind };
	});
	const pad = 6;
	return {
		...spec,
		count: boxes.length,
		nodes: boxes.flatMap((b) => [
			b.x,
			b.y,
			b.w,
			b.h,
			PREVIEW_KINDS.indexOf(b.kind),
		]),
		edges: spec.edges.flat(),
		groups: (spec.groups ?? []).map(({ members, color }) => {
			const m = members.map((i) => boxes[i]);
			const x = Math.min(...m.map((b) => b.x)) - pad;
			const y = Math.min(...m.map((b) => b.y)) - pad;
			return {
				x,
				y,
				w: Math.max(...m.map((b) => b.x + b.w)) + pad - x,
				h: Math.max(...m.map((b) => b.y + b.h)) + pad - y,
				color,
			};
		}),
	};
}

const solar = sketch({
	inputs: { sliders: 2, toggles: 0, lists: 1 },
	keyComponents: ["Mesh Surface", "Gradient"],
	scripts: ["Python 3"],
	scriptCount: 1,
	plugins: ["Ladybug"],
	pluginCount: 1,
	nodes: [
		[0, 0, "input"],
		[0, 0.3, "input"],
		[0, 0.6, "input"],
		[0.4, 1.5, "param"],
		[0.4, 2.1, "param"],
		[1.4, 0.1, "plugin"],
		[2.3, 0.2, "plugin"],
		[1.4, 1.4, "component"],
		[3.3, 0.9, "plugin"],
		[4.3, 0.8, "script"],
		[5.4, 0.3, "component"],
		[5.4, 1.4, "component"],
		[6.4, 0.2, "panel"],
		[6.6, 1.4, "plugin"],
	],
	edges: [
		[0, 5],
		[1, 6],
		[5, 6],
		[2, 7],
		[3, 7],
		[4, 8],
		[6, 8],
		[7, 8],
		[8, 9],
		[9, 10],
		[9, 11],
		[7, 11],
		[10, 11],
		[11, 13],
		[9, 12],
	],
	groups: [
		{ members: [0, 1, 2], color: "#508fbe" },
		{ members: [5, 6], color: "#a37bb4" },
		{ members: [3, 4, 7], color: "#61a697" },
		{ members: [10, 11, 12, 13], color: "#b5995a" },
	],
});

const voronoi = sketch({
	inputs: { sliders: 2, toggles: 0, lists: 0 },
	keyComponents: ["Voronoi", "Populate 2D"],
	scripts: [],
	scriptCount: 0,
	plugins: ["Pufferfish"],
	pluginCount: 1,
	nodes: [
		[0, 0, "input"],
		[0, 0.3, "input"],
		[0.4, 1, "param"],
		[1.4, 0.3, "component"],
		[2.4, 0.4, "component"],
		[1.4, 1.8, "param"],
		[2.4, 1.7, "component"],
		[3.4, 1.7, "component"],
		[3.4, 0.5, "component"],
		[4.5, 1, "plugin"],
		[5.5, 1, "component"],
		[6.4, 1.1, "panel"],
	],
	edges: [
		[0, 3],
		[1, 3],
		[2, 3],
		[3, 4],
		[2, 4],
		[4, 8],
		[5, 6],
		[8, 6],
		[6, 7],
		[7, 9],
		[4, 9],
		[9, 10],
		[10, 11],
	],
	groups: [
		{ members: [0, 1, 2], color: "#508fbe" },
		{ members: [3, 4, 8], color: "#61a697" },
		{ members: [5, 6, 7], color: "#bc8065" },
	],
});

const curve = sketch({
	inputs: { sliders: 0, toggles: 1, lists: 0 },
	keyComponents: ["Length", "Text Tag 3D"],
	scripts: ["C#"],
	scriptCount: 1,
	plugins: [],
	pluginCount: 0,
	nodes: [
		[0, 0.6, "param"],
		[1, 0.4, "component"],
		[0.6, 1.6, "input"],
		[2, 0.6, "script"],
		[3.1, 0.1, "component"],
		[3.1, 1.2, "panel"],
	],
	edges: [
		[0, 1],
		[1, 3],
		[2, 3],
		[0, 4],
		[3, 4],
		[3, 5],
	],
	groups: [{ members: [3, 4, 5], color: "#77a06e" }],
});

export const SAMPLE_PREVIEWS = { facade, solar, voronoi, curve } as const;
