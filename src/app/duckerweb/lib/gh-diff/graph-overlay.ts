import type { Edge } from "@xyflow/react";
import type { Component, Wire } from "parser/src/types";
import { generateFlowData } from "../../gh-flow-generator";
import type { GHComponentDiff, GHDiffStatus, GHNode } from "../../types/type";
import {
	endpointPortKey,
	resolveEndpointComponent,
	type DefinitionIndex,
} from "./definition-index";

type NodeIndex = Map<string, GHNode>;
type WireOverlay = { edges: Edge[]; added: number; removed: number };

const DIFF_COLORS: Record<GHDiffStatus, string> = {
	added: "#22c55e",
	modified: "#eab308",
	removed: "#ef4444",
	unchanged: "#737373",
};

function indexNodes(definition: DefinitionIndex): NodeIndex {
	const { nodes } = generateFlowData(definition.definition);
	return new Map(
		nodes.map((node) => [definition.identityById.get(node.id) ?? node.id, node])
	);
}

function withDiffPresentation(
	node: GHNode,
	component: Component,
	key: string,
	status: GHDiffStatus,
	position: GHNode["position"],
	geometry?: GHNode,
	layoutMoved = false
): GHNode {
	const inputs = Object.values(component.inputs);
	const outputs = Object.values(component.outputs);

	return {
		...node,
		id: key,
		position,
		style: geometry?.style ?? node.style,
		className:
			`${node.className ?? ""} gh-diff-node gh-diff-node--${status}${layoutMoved && status === "unchanged" ? " gh-diff-node--layout" : ""}`.trim(),
		data: {
			...node.data,
			containerBounds:
				geometry?.data.containerBounds ?? node.data.containerBounds,
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

function layoutTranslation(
	components: GHComponentDiff[],
	before: NodeIndex,
	after: NodeIndex
) {
	const shared = components.flatMap(({ key, status }) => {
		if (status === "added" || status === "removed") return [];
		const oldNode = before.get(key);
		const newNode = after.get(key);
		return oldNode && newNode ? [{ oldNode, newNode }] : [];
	});

	return {
		x: median(
			shared.map(
				({ oldNode, newNode }) => newNode.position.x - oldNode.position.x
			)
		),
		y: median(
			shared.map(
				({ oldNode, newNode }) => newNode.position.y - oldNode.position.y
			)
		),
	};
}

function buildOverlayNodes(
	before: DefinitionIndex,
	after: DefinitionIndex,
	components: GHComponentDiff[]
): GHNode[] {
	const oldNodes = indexNodes(before);
	const newNodes = indexNodes(after);
	const translation = layoutTranslation(components, oldNodes, newNodes);

	return components.flatMap((diff) => {
		const oldNode = oldNodes.get(diff.key);
		const newNode = newNodes.get(diff.key);
		const oldComponent = before.componentsByKey.get(diff.key);
		const newComponent = after.componentsByKey.get(diff.key);

		switch (diff.status) {
			case "removed":
				return oldNode && oldComponent
					? [
							withDiffPresentation(
								oldNode,
								oldComponent,
								diff.key,
								diff.status,
								oldNode.position
							),
						]
					: [];
			case "added":
				return newNode && newComponent
					? [
							withDiffPresentation(
								newNode,
								newComponent,
								diff.key,
								diff.status,
								{
									x: newNode.position.x - translation.x,
									y: newNode.position.y - translation.y,
								}
							),
						]
					: [];
			default:
				return oldNode && newNode && newComponent
					? [
							withDiffPresentation(
								newNode,
								newComponent,
								diff.key,
								diff.status,
								oldNode.position,
								oldNode,
								diff.layoutMoved
							),
						]
					: [];
		}
	});
}

function wireKey(wire: Wire): string {
	return `${wire.sourceComponentGuid ?? wire.from}->${wire.targetPortGuid ?? wire.to}`;
}

function handleId(
	definition: DefinitionIndex,
	componentId: string,
	endpoint: string,
	direction: "inputs" | "outputs"
): string | undefined {
	const portKey = endpointPortKey(endpoint, componentId);
	return portKey
		? definition.definition.components[componentId]?.[direction][portKey]
				?.instanceGuid
		: undefined;
}

function presentWire(
	wire: Wire,
	definition: DefinitionIndex,
	status: GHDiffStatus,
	index: number
): Edge | null {
	const sourceId = resolveEndpointComponent(definition, wire.from);
	const targetId = resolveEndpointComponent(definition, wire.to);
	if (!sourceId || !targetId) return null;

	return {
		id: `diff-${status}-${index}-${wireKey(wire)}`,
		type: "default",
		source: definition.identityById.get(sourceId) ?? sourceId,
		target: definition.identityById.get(targetId) ?? targetId,
		sourceHandle:
			handleId(definition, sourceId, wire.from, "outputs") ??
			wire.sourceComponentGuid ??
			wire.from,
		targetHandle:
			handleId(definition, targetId, wire.to, "inputs") ??
			wire.targetPortGuid ??
			wire.to,
		style: {
			stroke: DIFF_COLORS[status],
			strokeWidth: status === "unchanged" ? 1.25 : 2.5,
			opacity: status === "unchanged" ? 0.28 : 0.9,
		},
		data: { diffStatus: status },
	};
}

function buildOverlayEdges(
	before: DefinitionIndex,
	after: DefinitionIndex
): WireOverlay {
	const oldWires = new Map(
		before.definition.wires.map((wire) => [wireKey(wire), wire])
	);
	const newWires = new Map(
		after.definition.wires.map((wire) => [wireKey(wire), wire])
	);
	const edges: Edge[] = [];
	let added = 0;
	let removed = 0;

	for (const [key, wire] of newWires) {
		const status = oldWires.has(key) ? "unchanged" : "added";
		if (status === "added") added += 1;
		const edge = presentWire(wire, after, status, edges.length);
		if (edge) edges.push(edge);
	}

	for (const [key, wire] of oldWires) {
		if (newWires.has(key)) continue;
		removed += 1;
		const edge = presentWire(wire, before, "removed", edges.length);
		if (edge) edges.push(edge);
	}

	return { edges, added, removed };
}

export function buildGraphOverlay(
	before: DefinitionIndex,
	after: DefinitionIndex,
	components: GHComponentDiff[]
) {
	const wires = buildOverlayEdges(before, after);
	return {
		nodes: buildOverlayNodes(before, after, components),
		edges: wires.edges,
		addedWires: wires.added,
		removedWires: wires.removed,
	};
}
