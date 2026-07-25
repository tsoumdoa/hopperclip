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

// An identical instance GUID is proof of identity, so it must outrank every
// heuristic below: a component the user never replaced always pairs with itself.
const INSTANCE_MATCH_SCORE = 1_000_000;

function pairScore(before: Component, after: Component): number {
	if (componentKey(before) === componentKey(after)) return INSTANCE_MATCH_SCORE;
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

	const unclaimedBefore: DiffablePort[] = [];
	for (const beforePort of Object.values(beforePorts)) {
		const byNick = afterList.find(
			(entry) => !entry.used && entry.port.nick === beforePort.nick
		);
		if (byNick) claim(beforePort, byNick);
		else unclaimedBefore.push(beforePort);
	}

	// Renamed ports have no nickname anchor left, so pair the leftovers in
	// declaration order rather than reporting them as removed plus added.
	const unclaimedAfter = afterList.filter((entry) => !entry.used);
	unclaimedBefore.forEach((beforePort, index) =>
		claim(beforePort, unclaimedAfter[index])
	);
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
	// Keys still owned by an after-side component that stayed unpaired. Renaming
	// a pair onto one of those would produce two components with the same key,
	// and the key-indexed diff would silently drop one of them.
	const pairedAfterKeys = new Set(
		pairs.map((pair) => componentKey(pair.after))
	);
	const unpairedAfterKeys = new Set(
		Object.values(after.components)
			.map(componentKey)
			.filter((key) => !pairedAfterKeys.has(key))
	);
	let matchedCount = 0;

	for (const pair of pairs) {
		const beforeKey = componentKey(pair.before);
		const afterKey = componentKey(pair.after);
		if (beforeKey !== afterKey && unpairedAfterKeys.has(beforeKey)) continue;
		matchedCount += 1;
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

	return { before, after, matchedCount, replacedInstanceKeys };
}
