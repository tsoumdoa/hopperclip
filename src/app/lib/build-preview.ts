import type { Component, ParsedGrasshopper, Visuals } from "parser/src/types";
import {
	GRIP_KINDS,
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

function signatureOf(
	component: Component,
	parsed: ParsedGrasshopper
): PreviewSignature {
	const ports = (output: boolean) => {
		// Script components lead with a console "out" port that carries no result.
		const entries = Object.entries(
			output ? component.outputs : component.inputs
		)
			.map(([key, p]) => [key, clip(p.nick.trim())] as const)
			.filter(
				([, nick], i) =>
					nick && (!output || i > 0 || nick.toLowerCase() !== "out")
			);
		const shown = entries.slice(0, PREVIEW_CAPS.signaturePorts);
		return {
			names: shown.map(([, nick]) => nick),
			count: entries.length,
			kinds: shown.map(([key]) => {
				const handle = `${component.id}.${key}`;
				const wired = parsed.wires
					.filter((w) => (output ? w.from : w.to) === handle)
					.map((w) => {
						const id = resolveComponent(parsed, output ? w.to : w.from);
						const kind = id && kindOf(parsed.components[id]);
						return !kind || kind === "script"
							? null
							: kind === "input" || kind === "panel"
								? kind
								: "param";
					});
				// The most specific source wins when a port has several wires.
				return GRIP_KINDS.indexOf(
					(["input", "panel", "param"] as const).find((k) =>
						wired.includes(k)
					) ?? null
				);
			}),
		};
	};
	const inputs = ports(false),
		outputs = ports(true);
	return {
		language: clip(scriptName(component).trim()) || "Script",
		inputs: inputs.names,
		inputCount: inputs.count,
		inputKinds: inputs.kinds,
		outputs: outputs.names,
		outputCount: outputs.count,
		outputKinds: outputs.kinds,
	};
}

function names(values: string[], cap = Infinity) {
	return [...new Set(values.map((s) => s.trim()).filter(Boolean))]
		.slice(0, cap)
		.map(clip);
}

// Objects that only hold, pass or supply data: native params ("Contains a
// collection of ..."), sliders and other inputs, panels, contextual Get *
// inputs, and a few named widgets and data sources.
const DATA_NODE_TYPES = new Set([
	"slider",
	"toggle",
	"valueList",
	"button",
	"swatch",
	"panel",
	"scribble",
	"value",
]);
const DATA_SOURCES = new Set([
	"Relay",
	"MD Slider",
	"Digit Scroller",
	"Control Knob",
	"Colour Picker",
	"Calendar",
	"Clock",
	"Jump",
	"Cluster Input",
	"Cluster Output",
	"Geometry Pipeline",
]);

function isOperation(c: Component) {
	if (c.expression || c.internalExpression) return true;
	// Real parameter chunks have their own GUIDs; the parser's synthetic
	// container-level ports share the component's instance GUID.
	const ports = [...Object.values(c.inputs), ...Object.values(c.outputs)];
	if (ports.some((p) => p.instanceGuid !== c.instanceGuid))
		return Object.keys(c.inputs).length > 0;
	// Objects with only synthetic ports (or none) include params and sliders,
	// but also Path Mapper, Cherry Picker, Data Recorder... so allow known ones.
	return !(
		DATA_NODE_TYPES.has(getComponentNodeType(c)) ||
		DATA_SOURCES.has(c.type) ||
		/^(Contains a collection of|Contextual) /.test(c.description ?? "")
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
	// Anything that computes or comes from a plugin rules out a signature. Kept
	// separate from kindOf, whose panel check matches any type containing
	// "panel" and which treats relays and Get * as operations.
	const operations = components.some(
		(c) =>
			kindOf(c) !== "script" &&
			(isOperation(c) || isPlugin(libraryName(c.library ?? "")))
	);
	if (
		operations ||
		scriptComponents.length === 0 ||
		scriptComponents.length > PREVIEW_CAPS.signatureScripts
	)
		return undefined;
	const wires = new Map<string, number>();
	for (const wire of parsed.wires)
		for (const id of new Set([
			resolveComponent(parsed, wire.from),
			resolveComponent(parsed, wire.to),
		]))
			if (id !== undefined) wires.set(id, (wires.get(id) ?? 0) + 1);
	// Most connected script wins; ties keep definition order.
	return scriptComponents.reduce((best, c) =>
		(wires.get(c.id) ?? 0) > (wires.get(best.id) ?? 0) ? c : best
	);
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
	if (main) data.signature = signatureOf(main, parsed);

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
