import type { Component, ParsedGrasshopper, Visuals } from "parser/src/types";
import {
	PREVIEW_CAPS,
	PREVIEW_KINDS,
	type PreviewData,
	type PreviewKind,
	type PreviewSignature,
} from "../../types/preview";
import { getComponentNodeType } from "../duckerweb/lib/node-classifier";

const CANVAS_GROUP_GUID = "c552a431-af5b-46a9-a8a4-0fcbc27ef596";

function isCanvasGroup(component: Component) {
	return component.typeGuid === CANVAS_GROUP_GUID;
}

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

// Cap UTF-16 length without leaving half of a surrogate pair at the end.
function clip(s: string) {
	const cut = s.slice(0, PREVIEW_CAPS.nameLength);
	return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

function portNames(nicks: string[]) {
	const all = nicks.map((s) => clip(s.trim())).filter(Boolean);
	return {
		names: all.slice(0, PREVIEW_CAPS.signaturePorts),
		count: all.length,
	};
}

function signatureOf(component: Component): PreviewSignature {
	const inputs = portNames(Object.values(component.inputs).map((p) => p.nick));
	// Script components lead with a console "out" port that carries no result.
	const outputs = portNames(
		Object.values(component.outputs)
			.map((p) => p.nick)
			.filter((nick, i) => i > 0 || nick.trim().toLowerCase() !== "out")
	);
	return {
		language: clip(scriptName(component).trim()) || "Script",
		inputs: inputs.names,
		inputCount: inputs.count,
		outputs: outputs.names,
		outputCount: outputs.count,
	};
}

function names(values: string[], cap = Infinity) {
	return [...new Set(values.map((s) => s.trim()).filter(Boolean))]
		.slice(0, cap)
		.map(clip);
}

// Container-level synthetic ports share the component instance GUID. Real
// parameter chunks have their own GUIDs, even when their key is "value".
function hasOperationInputs(c: Component) {
	const entries = Object.entries(c.inputs);
	return (
		entries.length > 0 &&
		!(
			entries.length === 1 &&
			entries[0][0] === "value" &&
			entries[0][1].instanceGuid === c.instanceGuid &&
			Object.values(c.outputs).some((p) => p.instanceGuid === c.instanceGuid)
		)
	);
}
function resolveComponent(parsed: ParsedGrasshopper, endpoint: string) {
	for (let id = endpoint; ; id = id.slice(0, id.lastIndexOf("."))) {
		if (Object.prototype.hasOwnProperty.call(parsed.components, id)) return id;
		if (!id.includes(".")) return undefined;
	}
}

export function getSignatureScript(
	parsed: ParsedGrasshopper
): Component | undefined {
	const components = Object.values(parsed.components).filter(
		(c) => !isCanvasGroup(c)
	);
	const scriptComponents = components.filter((c) => kindOf(c) === "script");
	const operations = components.filter(
		(c) =>
			kindOf(c) !== "script" &&
			(hasOperationInputs(c) || isPlugin(libraryName(c.library ?? "")))
	).length;
	const resolve = (endpoint: string) => resolveComponent(parsed, endpoint);
	if (
		operations === 0 &&
		scriptComponents.length > 0 &&
		scriptComponents.length <= PREVIEW_CAPS.signatureScripts
	) {
		const wires = new Map<string, number>();
		for (const wire of parsed.wires)
			for (const id of new Set([resolve(wire.from), resolve(wire.to)]))
				if (id !== undefined) wires.set(id, (wires.get(id) ?? 0) + 1);
		// Most connected script wins; ties keep definition order.
		const main = scriptComponents.reduce((best, c) =>
			(wires.get(c.id) ?? 0) > (wires.get(best.id) ?? 0) ? c : best
		);
		return main;
	}
}

export function buildPreview(parsed: ParsedGrasshopper): PreviewData {
	const all = Object.values(parsed.components);
	const components = all.filter((c) => !isCanvasGroup(c));
	const data: PreviewData = {
		count: components.length,
		inputs: { sliders: 0, toggles: 0, lists: 0 },
		keyComponents: [],
		scripts: [],
		scriptCount: 0,
		plugins: [],
		pluginCount: 0,
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
		if (kind === "script") {
			scripts.push(scriptName(component));
		}
		// Most frequent operation nicknames first; ties keep definition order.
		// Inputs, parameters, panels, relays, scribbles and scripts are excluded.
		if (kind === "component" || kind === "plugin") {
			const name = clip(component.nickName.trim() || component.type);
			frequency.set(name, (frequency.get(name) ?? 0) + 1);
		}
	}
	data.keyComponents = names(
		[...frequency].sort((a, b) => b[1] - a[1]).map(([name]) => name),
		PREVIEW_CAPS.keyComponents
	);
	const scriptNames = names(scripts);
	data.scriptCount = scriptNames.length;
	data.scripts = scriptNames.slice(0, PREVIEW_CAPS.scripts);
	const pluginNames = names(
		[
			...(parsed.metadata?.libraries ?? []).map((l) => l.name),
			...components.map((c) => c.library ?? ""),
		]
			.map(libraryName)
			.filter(isPlugin)
	);
	data.pluginCount = pluginNames.length;
	data.plugins = pluginNames.slice(0, PREVIEW_CAPS.plugins);

	const resolve = (endpoint: string) => resolveComponent(parsed, endpoint);
	const main = getSignatureScript(parsed);
	if (main) data.signature = signatureOf(main);
	if (main && data.signature) {
		const kinds = (output: boolean) =>
			Object.entries(output ? main.outputs : main.inputs)
				.filter(
					([, p], i) =>
						p.nick.trim() &&
						(!output || i > 0 || p.nick.trim().toLowerCase() !== "out")
				)
				.slice(0, PREVIEW_CAPS.signaturePorts)
				.map(([key]) => {
					const candidates = parsed.wires
						.filter((w) => (output ? w.from : w.to) === `${main.id}.${key}`)
						.map((w) => resolve(output ? w.to : w.from))
						.filter((id): id is string => !!id)
						.sort();
					const c = parsed.components[candidates[0]];
					const kind = c && kindOf(c);
					return kind === "input"
						? 1
						: kind === "panel"
							? 2
							: kind === "param" ||
								  (c && !hasOperationInputs(c) && kind !== "script")
								? 3
								: 0;
				});
		data.signature.inputKinds = kinds(false);
		data.signature.outputKinds = kinds(true);
	}

	const bounds = new Map<string, NonNullable<Visuals["bounds"]>>();
	function boundsOf(
		c: Component,
		visiting = new Set<string>()
	): Visuals["bounds"] {
		if (visiting.has(c.id)) return undefined;
		if (bounds.has(c.id)) return bounds.get(c.id);
		let b = c.visuals?.bounds;
		if (isCanvasGroup(c) && c.members?.length) {
			visiting.add(c.id);
			const members = c.members.flatMap((id) => {
				const member = parsed.components[id];
				const rect = member && boundsOf(member, visiting);
				return rect ? [rect] : [];
			});
			visiting.delete(c.id);
			if (members.length) {
				const x = Math.min(...members.map((b) => b.x)) - 10;
				const y = Math.min(...members.map((b) => b.y)) - 10;
				b = {
					x,
					y,
					width: Math.max(...members.map((b) => b.x + b.width)) + 10 - x,
					height: Math.max(...members.map((b) => b.y + b.height)) + 10 - y,
				};
			}
		}
		if (!validBounds(b)) return undefined;
		bounds.set(c.id, b);
		return b;
	}
	const bounded = all.filter((c) => boundsOf(c));
	if (!bounded.length) return data;
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const c of bounded) {
		const b = bounds.get(c.id)!;
		minX = Math.min(minX, b.x);
		minY = Math.min(minY, b.y);
		maxX = Math.max(maxX, b.x + b.width);
		maxY = Math.max(maxY, b.y + b.height);
	}
	const extent = Math.max(maxX - minX, maxY - minY);
	if (!Number.isFinite(extent)) return data;
	const scale = extent > 0 ? 1000 / extent : 1;
	const rect = (c: Component) => {
		const b = bounds.get(c.id)!;
		return [
			Math.round((b.x - minX) * scale),
			Math.round((b.y - minY) * scale),
			Math.round(b.width * scale),
			Math.round(b.height * scale),
		];
	};
	const candidates = bounded.filter((c) => !isCanvasGroup(c));
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
		const sourceId = resolve(wire.from);
		const targetId = resolve(wire.to);
		const source = sourceId === undefined ? undefined : indices.get(sourceId);
		const target = targetId === undefined ? undefined : indices.get(targetId);
		if (source !== undefined && target !== undefined)
			data.edges.push(source, target);
		if (data.edges.length >= PREVIEW_CAPS.edges * 2) break;
	}
	for (const c of bounded.filter(isCanvasGroup).slice(0, PREVIEW_CAPS.groups)) {
		const [x, y, w, h] = rect(c);
		data.groups.push({ x, y, w, h, color: groupColor(c.visuals?.color) });
	}
	return data;
}
