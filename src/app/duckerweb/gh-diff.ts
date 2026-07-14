import type { Edge } from "@xyflow/react";
import type { Component, ParsedGrasshopper, Wire } from "parser/src/types";
import { generateFlowData } from "./gh-flow-generator";
import type {
	GHComponentDiff,
	GHDiffResult,
	GHDiffStatus,
	GHNode,
} from "./types/type";

const DIFF_COLORS: Record<GHDiffStatus, string> = {
	added: "#22c55e",
	modified: "#eab308",
	removed: "#ef4444",
	unchanged: "#737373",
};

function identity(component: Component): string {
	return component.instanceGuid || component.id;
}

function stableSerialize(value: unknown): string {
	if (value === undefined) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map(stableSerialize).join(",")}]`;
	}

	return `{${Object.entries(value as Record<string, unknown>)
		.filter(([, entry]) => entry !== undefined)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
		.join(",")}}`;
}

function same(a: unknown, b: unknown): boolean {
	return stableSerialize(a) === stableSerialize(b);
}

function componentLookup(parsed: ParsedGrasshopper): Map<string, Component> {
	return new Map(
		Object.values(parsed.components).map((component) => [
			identity(component),
			component,
		])
	);
}

function componentIdToIdentity(parsed: ParsedGrasshopper): Map<string, string> {
	return new Map(
		Object.values(parsed.components).map((component) => [
			component.id,
			identity(component),
		])
	);
}

function comparablePorts(component: Component) {
	const normalize = (ports: Component["inputs"] | Component["outputs"]) =>
		Object.values(ports)
			.map((port) => {
				const {
					source: _source,
					sources: _sources,
					...logic
				} = port as unknown as {
					source?: string;
					sources?: string[];
				} & Record<string, unknown>;
				return logic;
			})
			.sort((a, b) =>
				String(a.instanceGuid).localeCompare(String(b.instanceGuid))
			);

	return {
		inputs: normalize(component.inputs),
		outputs: normalize(component.outputs),
	};
}

function comparableMembers(
	component: Component,
	parsed: ParsedGrasshopper
): string[] {
	const idMap = componentIdToIdentity(parsed);
	return (component.members ?? [])
		.map((member) => idMap.get(member) ?? member)
		.sort();
}

function componentChangeReasons(
	before: Component,
	after: Component,
	beforeParsed: ParsedGrasshopper,
	afterParsed: ParsedGrasshopper
): string[] {
	const reasons: string[] = [];

	if (
		!same(
			{
				type: before.type,
				typeGuid: before.typeGuid,
				nickName: before.nickName,
				library: before.library,
				description: before.description,
			},
			{
				type: after.type,
				typeGuid: after.typeGuid,
				nickName: after.nickName,
				library: after.library,
				description: after.description,
			}
		)
	) {
		reasons.push("Component details");
	}
	if (!same(comparablePorts(before), comparablePorts(after))) {
		reasons.push("Port settings");
	}
	if (!same(before.value, after.value)) reasons.push("Value");
	if (
		!same(
			{ expression: before.expression, internal: before.internalExpression },
			{ expression: after.expression, internal: after.internalExpression }
		)
	) {
		reasons.push("Expression");
	}
	if (!same(before.script, after.script)) reasons.push("Script");
	if (!same(before.cluster, after.cluster)) reasons.push("Cluster contents");
	if (
		!same(
			comparableMembers(before, beforeParsed),
			comparableMembers(after, afterParsed)
		)
	) {
		reasons.push("Group membership");
	}
	if (
		!same(
			{
				hidden: before.state?.hidden,
				locked: before.state?.locked,
				frozen: before.state?.frozen,
			},
			{
				hidden: after.state?.hidden,
				locked: after.state?.locked,
				frozen: after.state?.frozen,
			}
		)
	) {
		reasons.push("Runtime state");
	}

	return reasons;
}

function hasMoved(before: Component, after: Component): boolean {
	const beforePosition = before.visuals?.pivot ?? before.visuals?.bounds;
	const afterPosition = after.visuals?.pivot ?? after.visuals?.bounds;
	if (!beforePosition || !afterPosition) return false;
	return (
		Math.abs(beforePosition.x - afterPosition.x) > 2 ||
		Math.abs(beforePosition.y - afterPosition.y) > 2
	);
}

function wireKey(wire: Wire): string {
	return `${wire.sourceComponentGuid ?? wire.from}->${wire.targetPortGuid ?? wire.to}`;
}

function findComponentId(endpoint: string, ids: string[]): string | undefined {
	return ids
		.filter((id) => endpoint === id || endpoint.startsWith(`${id}.`))
		.sort((a, b) => b.length - a.length)[0];
}

function normalizeNode(
	node: GHNode,
	component: Component,
	key: string,
	status: GHDiffStatus,
	position: GHNode["position"],
	geometrySource?: GHNode
): GHNode {
	const inputs = Object.values(component.inputs);
	const outputs = Object.values(component.outputs);

	return {
		...node,
		id: key,
		position,
		style: geometrySource?.style ?? node.style,
		className: `gh-diff-node gh-diff-node--${status}`,
		data: {
			...node.data,
			containerBounds:
				geometrySource?.data.containerBounds ?? node.data.containerBounds,
			inputs: node.data.inputs.map((port, index) => ({
				...port,
				id: inputs[index]?.instanceGuid ?? `${key}:input:${index}`,
			})),
			outputs: node.data.outputs.map((port, index) => ({
				...port,
				id: outputs[index]?.instanceGuid ?? `${key}:output:${index}`,
			})),
		},
	};
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function buildOverlayNodes(
	before: ParsedGrasshopper,
	after: ParsedGrasshopper,
	components: GHComponentDiff[]
): GHNode[] {
	const beforeFlow = generateFlowData(before);
	const afterFlow = generateFlowData(after);
	const beforeNodes = new Map(beforeFlow.nodes.map((node) => [node.id, node]));
	const afterNodes = new Map(afterFlow.nodes.map((node) => [node.id, node]));
	const beforeComponents = componentLookup(before);
	const afterComponents = componentLookup(after);
	const beforeIdMap = componentIdToIdentity(before);
	const afterIdMap = componentIdToIdentity(after);
	const beforeNodeByKey = new Map(
		[...beforeNodes].map(([id, node]) => [beforeIdMap.get(id) ?? id, node])
	);
	const afterNodeByKey = new Map(
		[...afterNodes].map(([id, node]) => [afterIdMap.get(id) ?? id, node])
	);

	const common = components.filter(
		(component) =>
			component.status === "unchanged" || component.status === "modified"
	);
	const offsetX = median(
		common.flatMap((component) => {
			const a = beforeNodeByKey.get(component.key);
			const b = afterNodeByKey.get(component.key);
			return a && b ? [b.position.x - a.position.x] : [];
		})
	);
	const offsetY = median(
		common.flatMap((component) => {
			const a = beforeNodeByKey.get(component.key);
			const b = afterNodeByKey.get(component.key);
			return a && b ? [b.position.y - a.position.y] : [];
		})
	);

	return components.flatMap((diff) => {
		const beforeNode = beforeNodeByKey.get(diff.key);
		const afterNode = afterNodeByKey.get(diff.key);
		const beforeComponent = beforeComponents.get(diff.key);
		const afterComponent = afterComponents.get(diff.key);

		if (diff.status === "removed" && beforeNode && beforeComponent) {
			return [
				normalizeNode(
					beforeNode,
					beforeComponent,
					diff.key,
					diff.status,
					beforeNode.position
				),
			];
		}
		if (diff.status === "added" && afterNode && afterComponent) {
			return [
				normalizeNode(afterNode, afterComponent, diff.key, diff.status, {
					x: afterNode.position.x - offsetX,
					y: afterNode.position.y - offsetY,
				}),
			];
		}
		if (afterNode && afterComponent && beforeNode) {
			return [
				normalizeNode(
					afterNode,
					afterComponent,
					diff.key,
					diff.status,
					beforeNode.position,
					beforeNode
				),
			];
		}
		return [];
	});
}

function overlayEdge(
	wire: Wire,
	parsed: ParsedGrasshopper,
	status: GHDiffStatus,
	index: number
): Edge | null {
	const ids = Object.keys(parsed.components);
	const idMap = componentIdToIdentity(parsed);
	const sourceId = findComponentId(wire.from, ids);
	const targetId = findComponentId(wire.to, ids);
	if (!sourceId || !targetId) return null;
	const sourcePortKey = wire.from.startsWith(`${sourceId}.`)
		? wire.from.slice(sourceId.length + 1)
		: undefined;
	const targetPortKey = wire.to.startsWith(`${targetId}.`)
		? wire.to.slice(targetId.length + 1)
		: undefined;
	const sourceHandle = sourcePortKey
		? parsed.components[sourceId]?.outputs[sourcePortKey]?.instanceGuid
		: undefined;
	const targetHandle = targetPortKey
		? parsed.components[targetId]?.inputs[targetPortKey]?.instanceGuid
		: undefined;

	return {
		id: `diff-${status}-${index}-${wireKey(wire)}`,
		type: "default",
		source: idMap.get(sourceId) ?? sourceId,
		target: idMap.get(targetId) ?? targetId,
		sourceHandle: sourceHandle ?? wire.sourceComponentGuid ?? wire.from,
		targetHandle: targetHandle ?? wire.targetPortGuid ?? wire.to,
		style: {
			stroke: DIFF_COLORS[status],
			strokeWidth: status === "unchanged" ? 1.25 : 2.5,
			opacity: status === "unchanged" ? 0.28 : 0.9,
		},
		data: { diffStatus: status },
	};
}

function buildOverlayEdges(
	before: ParsedGrasshopper,
	after: ParsedGrasshopper
): { edges: Edge[]; added: number; removed: number } {
	const beforeWires = new Map(
		before.wires.map((wire) => [wireKey(wire), wire])
	);
	const afterWires = new Map(after.wires.map((wire) => [wireKey(wire), wire]));
	const edges: Edge[] = [];
	let added = 0;
	let removed = 0;

	for (const [key, wire] of afterWires) {
		const status: GHDiffStatus = beforeWires.has(key) ? "unchanged" : "added";
		if (status === "added") added += 1;
		const edge = overlayEdge(wire, after, status, edges.length);
		if (edge) edges.push(edge);
	}
	for (const [key, wire] of beforeWires) {
		if (afterWires.has(key)) continue;
		removed += 1;
		const edge = overlayEdge(wire, before, "removed", edges.length);
		if (edge) edges.push(edge);
	}

	return { edges, added, removed };
}

export function diffGrasshopper(
	before: ParsedGrasshopper,
	after: ParsedGrasshopper
): GHDiffResult {
	const beforeComponents = componentLookup(before);
	const afterComponents = componentLookup(after);
	const keys = new Set([...beforeComponents.keys(), ...afterComponents.keys()]);
	const components: GHComponentDiff[] = [];
	let layoutMoves = 0;

	for (const key of keys) {
		const oldComponent = beforeComponents.get(key);
		const newComponent = afterComponents.get(key);

		if (!oldComponent && newComponent) {
			components.push({
				key,
				label: newComponent.nickName,
				type: newComponent.type,
				status: "added",
				changes: ["Component added"],
			});
			continue;
		}
		if (oldComponent && !newComponent) {
			components.push({
				key,
				label: oldComponent.nickName,
				type: oldComponent.type,
				status: "removed",
				changes: ["Component removed"],
			});
			continue;
		}
		if (!oldComponent || !newComponent) continue;

		const changes = componentChangeReasons(
			oldComponent,
			newComponent,
			before,
			after
		);
		if (hasMoved(oldComponent, newComponent)) layoutMoves += 1;
		components.push({
			key,
			label: newComponent.nickName,
			type: newComponent.type,
			status: changes.length > 0 ? "modified" : "unchanged",
			changes,
		});
	}

	const statusOrder: Record<GHDiffStatus, number> = {
		modified: 0,
		added: 1,
		removed: 2,
		unchanged: 3,
	};
	components.sort(
		(a, b) =>
			statusOrder[a.status] - statusOrder[b.status] ||
			a.label.localeCompare(b.label)
	);

	const wireDiff = buildOverlayEdges(before, after);
	const counts = {
		added: components.filter((item) => item.status === "added").length,
		modified: components.filter((item) => item.status === "modified").length,
		removed: components.filter((item) => item.status === "removed").length,
		unchanged: components.filter((item) => item.status === "unchanged").length,
	};

	return {
		components,
		counts,
		layoutMoves,
		addedWires: wireDiff.added,
		removedWires: wireDiff.removed,
		nodes: buildOverlayNodes(before, after, components),
		edges: wireDiff.edges,
	};
}
