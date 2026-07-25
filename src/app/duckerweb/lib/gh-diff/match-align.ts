import type {
	Component,
	InputPort,
	OutputPort,
	ParsedGrasshopper,
} from "parser/src/types";
import { componentKey } from "./definition-index";

export type DiffMatchMode = "instance" | "type";

type DiffablePort = InputPort | OutputPort;

type ComponentPair = {
	before: Component;
	after: Component;
	score: number;
};

function typeIdentity(component: Component): string {
	return component.typeGuid || component.type || component.id;
}

function componentPosition(
	component: Component
): { x: number; y: number } | null {
	const point = component.visuals?.pivot ?? component.visuals?.bounds;
	return point ? { x: point.x, y: point.y } : null;
}

function pairScore(before: Component, after: Component): number {
	let score = 1;
	if (before.nickName === after.nickName) score += 1000;
	const beforePos = componentPosition(before);
	const afterPos = componentPosition(after);
	if (beforePos && afterPos) {
		const distance = Math.hypot(
			beforePos.x - afterPos.x,
			beforePos.y - afterPos.y
		);
		score += Math.max(0, 500 - distance);
	}
	return score;
}

/**
 * Greedy 1:1 pairing for components that share a type GUID. Prefers matching
 * nicknames and nearby canvas positions when several instances exist.
 */
export function pairComponentsByType(
	beforeComponents: Component[],
	afterComponents: Component[]
): Array<{ before: Component; after: Component }> {
	const candidates: ComponentPair[] = [];
	for (const before of beforeComponents) {
		for (const after of afterComponents) {
			if (typeIdentity(before) !== typeIdentity(after)) continue;
			candidates.push({
				before,
				after,
				score: pairScore(before, after),
			});
		}
	}

	candidates.sort(
		(a, b) => b.score - a.score || a.before.id.localeCompare(b.before.id)
	);

	const usedBefore = new Set<string>();
	const usedAfter = new Set<string>();
	const pairs: Array<{ before: Component; after: Component }> = [];

	for (const candidate of candidates) {
		const beforeKey = componentKey(candidate.before);
		const afterKey = componentKey(candidate.after);
		if (usedBefore.has(beforeKey) || usedAfter.has(afterKey)) continue;
		usedBefore.add(beforeKey);
		usedAfter.add(afterKey);
		pairs.push({ before: candidate.before, after: candidate.after });
	}

	return pairs;
}

function remapPorts(
	beforePorts: Record<string, DiffablePort>,
	afterPorts: Record<string, DiffablePort>,
	portRemap: Map<string, string>
) {
	const beforeList = Object.values(beforePorts);
	const afterList = Object.values(afterPorts).map((port) => ({
		port,
		originalGuid: port.instanceGuid,
		used: false,
	}));

	const claim = (
		beforePort: DiffablePort,
		entry: (typeof afterList)[number] | undefined
	) => {
		if (!entry) return;
		entry.used = true;
		portRemap.set(entry.originalGuid, beforePort.instanceGuid);
		entry.port.instanceGuid = beforePort.instanceGuid;
	};

	for (const beforePort of beforeList) {
		claim(
			beforePort,
			afterList.find(
				(entry) => !entry.used && entry.port.nick === beforePort.nick
			)
		);
	}

	const unmatchedBefore = beforeList.filter(
		(beforePort) =>
			!afterList.some(
				(entry) => entry.port.instanceGuid === beforePort.instanceGuid
			)
	);
	const unmatchedAfter = afterList.filter((entry) => !entry.used);
	for (let index = 0; index < unmatchedBefore.length; index += 1) {
		claim(unmatchedBefore[index], unmatchedAfter[index]);
	}
}

/**
 * Align two definitions so the shared diff pipeline can key by instance GUID.
 * In `type` mode, after-side instance/port GUIDs are rewritten onto their
 * type-paired before counterparts (and wires are remapped accordingly).
 *
 * `replacedInstanceKeys` lists shared keys whose after-side instance GUID
 * originally differed — i.e. same type, newly placed component.
 */
export function alignDefinitionsForMatchMode(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper,
	mode: DiffMatchMode
): {
	before: ParsedGrasshopper;
	after: ParsedGrasshopper;
	matchedCount: number;
	replacedInstanceKeys: Set<string>;
} {
	if (mode === "instance") {
		const beforeKeys = new Set(
			Object.values(beforeDefinition.components).map(componentKey)
		);
		const matchedCount = Object.values(afterDefinition.components).filter(
			(component) => beforeKeys.has(componentKey(component))
		).length;
		return {
			before: beforeDefinition,
			after: afterDefinition,
			matchedCount,
			replacedInstanceKeys: new Set(),
		};
	}

	const before = beforeDefinition;
	const after = structuredClone(afterDefinition);
	const pairs = pairComponentsByType(
		Object.values(before.components),
		Object.values(after.components)
	);
	const instanceRemap = new Map<string, string>();
	const portRemap = new Map<string, string>();
	const replacedInstanceKeys = new Set<string>();

	for (const pair of pairs) {
		const beforeKey = componentKey(pair.before);
		const afterKey = componentKey(pair.after);
		instanceRemap.set(afterKey, beforeKey);
		if (beforeKey !== afterKey) replacedInstanceKeys.add(beforeKey);
		pair.after.instanceGuid = beforeKey;
		remapPorts(pair.before.inputs, pair.after.inputs, portRemap);
		remapPorts(pair.before.outputs, pair.after.outputs, portRemap);
	}

	for (const wire of after.wires) {
		// Despite the name, sourceComponentGuid is usually an output port GUID.
		if (wire.sourceComponentGuid) {
			const remappedSource =
				portRemap.get(wire.sourceComponentGuid) ??
				instanceRemap.get(wire.sourceComponentGuid);
			if (remappedSource) wire.sourceComponentGuid = remappedSource;
		}

		const remappedTarget = wire.targetPortGuid
			? portRemap.get(wire.targetPortGuid)
			: undefined;
		if (remappedTarget) wire.targetPortGuid = remappedTarget;
	}

	return { before, after, matchedCount: pairs.length, replacedInstanceKeys };
}
