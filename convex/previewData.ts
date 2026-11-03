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
	scriptCount: v.number(),
	plugins: v.array(v.string()),
	pluginCount: v.number(),
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
	signature: v.optional(
		v.object({
			language: v.string(),
			inputs: v.array(v.string()),
			inputCount: v.number(),
			outputs: v.array(v.string()),
			outputCount: v.number(),
		})
	),
});

export function validatePreview(data: PreviewData) {
	const integer = (n: number, max = Number.MAX_SAFE_INTEGER) =>
		Number.isSafeInteger(n) && n >= 0 && n <= max;
	if (
		!integer(data.count) ||
		!Object.values(data.inputs).every((n) => integer(n, data.count)) ||
		!integer(data.scriptCount, data.count) ||
		!integer(data.pluginCount) ||
		data.scripts.length !== Math.min(data.scriptCount, PREVIEW_CAPS.scripts) ||
		data.plugins.length !== Math.min(data.pluginCount, PREVIEW_CAPS.plugins)
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
	const sig = data.signature;
	const validName = (s: string) =>
		!!s.trim() && s.length <= PREVIEW_CAPS.nameLength;
	if (
		sig &&
		(!validName(sig.language) ||
			!integer(sig.inputCount) ||
			!integer(sig.outputCount) ||
			sig.inputs.length !==
				Math.min(sig.inputCount, PREVIEW_CAPS.signaturePorts) ||
			sig.outputs.length !==
				Math.min(sig.outputCount, PREVIEW_CAPS.signaturePorts) ||
			![...sig.inputs, ...sig.outputs].every(validName))
	)
		throw new Error("Invalid preview signature");
}
