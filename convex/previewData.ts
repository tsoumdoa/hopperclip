import { v } from "convex/values";
import {
	PREVIEW_CAPS,
	PREVIEW_KINDS,
	type PreviewData,
} from "../src/types/preview";

export const previewDataValidator = v.object({
	count: v.number(),
	inputs: v.object({
		sliders: v.number(),
		toggles: v.number(),
		lists: v.number(),
	}),
	keyComponents: v.array(v.string()),
	scripts: v.array(v.string()),
	plugins: v.array(v.string()),
	nodes: v.array(v.number()),
	edges: v.array(v.number()),
	groups: v.array(
		v.object({
			x: v.number(),
			y: v.number(),
			w: v.number(),
			h: v.number(),
			color: v.string(),
		})
	),
});

export function validatePreview(data: PreviewData) {
	const integer = (n: number, max = Number.MAX_SAFE_INTEGER) =>
		Number.isSafeInteger(n) && n >= 0 && n <= max;
	if (
		!integer(data.count) ||
		!Object.values(data.inputs).every((n) => integer(n, data.count))
	)
		throw new Error("Invalid preview counts");
	for (const field of ["keyComponents", "scripts", "plugins"] as const) {
		if (
			data[field].length > PREVIEW_CAPS[field] ||
			data[field].some((s) => !s.trim() || s.length > PREVIEW_CAPS.nameLength)
		)
			throw new Error("Preview names exceed caps");
	}
	if (
		data.nodes.length % 5 ||
		data.nodes.length > PREVIEW_CAPS.nodes * 5 ||
		data.nodes.length / 5 > data.count ||
		data.nodes.some(
			(n, i) => !integer(n, i % 5 === 4 ? PREVIEW_KINDS.length - 1 : 1000)
		)
	)
		throw new Error("Invalid preview nodes");
	if (
		data.edges.length % 2 ||
		data.edges.length > PREVIEW_CAPS.edges * 2 ||
		data.edges.some((n) => !integer(n, data.nodes.length / 5 - 1))
	)
		throw new Error("Invalid preview edges");
	if (
		data.groups.length > PREVIEW_CAPS.groups ||
		data.groups.some(
			(g) =>
				![g.x, g.y, g.w, g.h].every((n) => integer(n, 1000)) ||
				!/^#[0-9a-f]{6}$/i.test(g.color)
		)
	)
		throw new Error("Invalid preview groups");
}
