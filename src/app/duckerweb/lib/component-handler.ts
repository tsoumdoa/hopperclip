import type { Component } from "parser/src/types";
import type { GHNode, GHNodeData, GHNodeType } from "../types/type";
import type { NodePosition } from "./node-positions";
import { getAccentColor } from "./node-classifier";
import { extractValue } from "./value-extractor";

function getRelativePortPosition(
	component: Component,
	port: Component["inputs"][string] | Component["outputs"][string]
): number | undefined {
	const componentBounds = component.visuals?.bounds;
	if (!componentBounds || componentBounds.height <= 0) return undefined;

	const portY =
		port.visuals?.pivot?.y ??
		(port.visuals?.bounds
			? port.visuals.bounds.y + port.visuals.bounds.height / 2
			: undefined);
	if (portY === undefined) return undefined;

	return Math.max(
		0,
		Math.min(1, (portY - componentBounds.y) / componentBounds.height)
	);
}

function getPortColumnWidth(
	component: Component,
	ports: Array<Component["inputs"][string] | Component["outputs"][string]>,
	side: "input" | "output"
): number | undefined {
	const componentBounds = component.visuals?.bounds;
	if (!componentBounds) return undefined;
	if (ports.length === 0) return 0;

	const bounds = ports.map((port) => port.visuals?.bounds);
	if (bounds.some((candidate) => !candidate)) return undefined;
	const portBounds = bounds.filter((candidate) => candidate !== undefined);

	return side === "input"
		? Math.max(
				...portBounds.map((candidate) => candidate.x + candidate.width)
			) - componentBounds.x
		: componentBounds.x +
				componentBounds.width -
				Math.min(...portBounds.map((candidate) => candidate.x));
}

export function handleComponent(
	component: Component,
	nodePositions: Map<string, NodePosition>,
	nodeType: GHNodeType
): GHNode {
	const inputPorts = Object.values(component.inputs);
	const outputPorts = Object.values(component.outputs);
	const inputWidth = getPortColumnWidth(component, inputPorts, "input");
	const outputWidth = getPortColumnWidth(component, outputPorts, "output");
	const inputs = Object.entries(component.inputs).map(([key, port]) => ({
		id: `${component.id}.${key}`,
		label: port.nick,
		options: port.options,
		hasSource: !!port.source,
		position: getRelativePortPosition(component, port),
		labelOffset:
			component.visuals?.bounds && port.visuals?.bounds
				? port.visuals.bounds.x - component.visuals.bounds.x
				: undefined,
		labelWidth: port.visuals?.bounds?.width,
	}));

	const outputEntries = Object.entries(component.outputs);
	const outputs = outputEntries.map(([key, port]) => ({
		id: `${component.id}.${key}`,
		label: port.nick,
		options:
			component.internalExpression && outputEntries.length === 1
				? {
						...port.options,
						expression:
							port.options?.expression ?? component.internalExpression,
					}
				: port.options,
		position: getRelativePortPosition(component, port),
		labelOffset:
			component.visuals?.bounds &&
			port.visuals?.bounds &&
			outputWidth !== undefined
				? port.visuals.bounds.x -
					(component.visuals.bounds.x +
						component.visuals.bounds.width -
						outputWidth)
				: undefined,
		labelWidth: port.visuals?.bounds?.width,
	}));

	const position = nodePositions.get(component.id) ?? {
		x: Math.random() * 400,
		y: Math.random() * 300,
		width: 100,
		height: 40,
	};

	const nodeData: GHNodeData = {
		label: component.nickName,
		type: nodeType,
		inputs,
		outputs,
		accentColor: getAccentColor(component),
		selected: component.state?.selected,
		runtimeState:
			component.state?.locked || component.state?.frozen
				? "locked"
				: component.state?.hidden
					? "hidden"
					: "normal",
		value: extractValue(component),
		height: position.height,
		inputWidth,
		outputWidth,
		usesGrasshopperBounds: component.visuals?.bounds !== undefined,
	};
	const runtimeClasses = [
		component.state?.hidden && "gh-runtime-node--hidden",
		(component.state?.locked || component.state?.frozen) &&
			"gh-runtime-node--locked",
	].filter(Boolean);

	if (component.value?.type === "valueList") {
		nodeData.items = component.value.items;
		nodeData.selectedIndex = component.value.selectedIndex;
	}

	if (component.value?.type === "swatch" && component.value.color) {
		nodeData.color = component.value.color;
	}

	if (component.value?.type === "scribble") {
		nodeData.scribble = {
			font: component.value.font ?? "Arial",
			size: component.value.size ?? 12,
			bold: component.value.bold === true,
			italic: component.value.italic === true,
			corners: component.value.corners,
			componentBounds: component.visuals?.bounds,
		};
	}

	if (component.script) {
		nodeData.script = component.script;
	}

	return {
		id: component.id,
		type: nodeType,
		position: { x: position.x, y: position.y },
		style: { width: position.width, height: position.height },
		data: nodeData,
		className: runtimeClasses.join(" "),
		zIndex: 10,
	} as GHNode;
}
