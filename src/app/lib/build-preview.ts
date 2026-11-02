import type { Component, ParsedGrasshopper, Visuals } from "parser/src/types";
import {
	PREVIEW_CAPS,
	PREVIEW_KINDS,
	type PreviewData,
	type PreviewKind,
} from "../../types/preview";
import { getComponentNodeType } from "../duckerweb/lib/node-classifier";

function libraryName(name: string) {
	return name.replace(/\s+v\d.*$/i, "").trim();
}

function isPlugin(name: string) {
	return !!name && !/^(grasshopper|gh_io|rhino)(\b|_)/i.test(name);
}

function kindOf(component: Component): PreviewKind {
	const type = getComponentNodeType(component);
	if (type === "script" || component.script) return "script";
	if (["slider", "toggle", "valueList", "button", "swatch"].includes(type))
		return "input";
	if (type === "panel") return "panel";
	if (["value", "relay", "scribble"].includes(type)) return "param";
	if (isPlugin(libraryName(component.library ?? ""))) return "plugin";
	// Standalone parameters have no input/output ports in the parser output.
	if (
		!Object.keys(component.inputs).length &&
		!Object.keys(component.outputs).length
	)
		return "param";
	return "component";
}

function scriptName(component: Component) {
	const name = `${component.type} ${component.script?.language ?? ""}`;
	if (/python/i.test(name))
		return /python\s*3/i.test(name) ? "Python 3" : "Python";
	if (/csharp|c#/i.test(name)) return "C#";
	if (/\bvb/i.test(name)) return "VB";
	return component.script?.language || component.type;
}

function validBounds(
	bounds: Visuals["bounds"]
): bounds is NonNullable<Visuals["bounds"]> {
	return (
		!!bounds &&
		Object.values(bounds).every(Number.isFinite) &&
		bounds.width >= 0 &&
		bounds.height >= 0 &&
		Number.isFinite(bounds.x + bounds.width) &&
		Number.isFinite(bounds.y + bounds.height)
	);
}

function groupColor(argb?: string) {
	const channels = argb?.split(";").map(Number);
	if (!channels || channels.length !== 4 || !channels.every(Number.isFinite))
		return "#a3a3a3";
	return (
		"#" +
		channels
			.slice(1)
			.map((c) =>
				Math.round(Math.max(0, Math.min(255, c)))
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
}

function names(values: string[], cap: number) {
	return [
		...new Set(
			values
				.map((s) => s.trim().slice(0, PREVIEW_CAPS.nameLength))
				.filter(Boolean)
		),
	].slice(0, cap);
}

export function buildPreview(parsed: ParsedGrasshopper): PreviewData {
	const all = Object.values(parsed.components);
	const components = all.filter((c) => getComponentNodeType(c) !== "group");
	const data: PreviewData = {
		count: components.length,
		inputs: { sliders: 0, toggles: 0, lists: 0 },
		keyComponents: [],
		scripts: [],
		plugins: [],
		nodes: [],
		edges: [],
		groups: [],
	};
	const frequency = new Map<string, number>();
	const scripts: string[] = [];
	for (const component of components) {
		const type = getComponentNodeType(component);
		if (type === "slider") data.inputs.sliders++;
		if (type === "toggle") data.inputs.toggles++;
		if (type === "valueList") data.inputs.lists++;
		const kind = kindOf(component);
		if (kind === "script") scripts.push(scriptName(component));
		// Most frequent operation nicknames first; ties keep definition order.
		// Inputs, parameters, panels, relays, scribbles and scripts are excluded.
		if (kind === "component" || kind === "plugin") {
			const name = (component.nickName.trim() || component.type).slice(
				0,
				PREVIEW_CAPS.nameLength
			);
			frequency.set(name, (frequency.get(name) ?? 0) + 1);
		}
	}
	data.keyComponents = names(
		[...frequency].sort((a, b) => b[1] - a[1]).map(([name]) => name),
		PREVIEW_CAPS.keyComponents
	);
	data.scripts = names(scripts, PREVIEW_CAPS.scripts);
	data.plugins = names(
		[
			...(parsed.metadata?.libraries ?? []).map((l) => l.name),
			...components.map((c) => c.library ?? ""),
		]
			.map(libraryName)
			.filter(isPlugin),
		PREVIEW_CAPS.plugins
	);

	const bounded = all.filter((c) => validBounds(c.visuals?.bounds));
	if (!bounded.length) return data;
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const c of bounded) {
		const b = c.visuals!.bounds!;
		minX = Math.min(minX, b.x);
		minY = Math.min(minY, b.y);
		maxX = Math.max(maxX, b.x + b.width);
		maxY = Math.max(maxY, b.y + b.height);
	}
	const extent = Math.max(maxX - minX, maxY - minY);
	if (!Number.isFinite(extent)) return data;
	const scale = extent > 0 ? 1000 / extent : 1;
	const rect = (c: Component) => {
		const b = c.visuals!.bounds!;
		return [
			Math.round((b.x - minX) * scale),
			Math.round((b.y - minY) * scale),
			Math.round(b.width * scale),
			Math.round(b.height * scale),
		];
	};
	const candidates = bounded.filter((c) => getComponentNodeType(c) !== "group");
	const kept = Math.min(candidates.length, PREVIEW_CAPS.nodes);
	const indices = new Map<string, number>();
	for (let i = 0; i < kept; i++) {
		// Even sampling includes both ends and is stable for the same content.
		const index =
			kept === 1 ? 0 : Math.floor((i * (candidates.length - 1)) / (kept - 1));
		const c = candidates[index];
		indices.set(c.id, i);
		data.nodes.push(...rect(c), PREVIEW_KINDS.indexOf(kindOf(c)));
	}
	for (const wire of parsed.wires) {
		const source = indices.get(wire.from.split(".")[0]);
		const target = indices.get(wire.to.split(".")[0]);
		if (source !== undefined && target !== undefined)
			data.edges.push(source, target);
		if (data.edges.length >= PREVIEW_CAPS.edges * 2) break;
	}
	for (const c of bounded
		.filter((c) => getComponentNodeType(c) === "group")
		.slice(0, PREVIEW_CAPS.groups)) {
		const [x, y, w, h] = rect(c);
		data.groups.push({ x, y, w, h, color: groupColor(c.visuals?.color) });
	}
	return data;
}
