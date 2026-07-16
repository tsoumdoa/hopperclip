import type { Component } from "parser/src/types";
import type { GHNode, GHNodeData, GHNodeType } from "../types/type";
import type { NodePosition } from "./node-positions";
import { getAccentColor } from "./node-classifier";
import { extractValue } from "./value-extractor";

export function handleComponent(
	component: Component,
	nodePositions: Map<string, NodePosition>,
	nodeType: GHNodeType
): GHNode {
	const inputs = Object.entries(component.inputs).map(([key, port]) => ({
		id: `${component.id}.${key}`,
		label: port.nick,
		options: port.options,
		hasSource: !!port.source,
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

	if (component.script) {
		nodeData.script = component.script;
	}

	return {
		id: component.id,
		type: nodeType,
		position,
		data: nodeData,
		className: runtimeClasses.join(" "),
		zIndex: 10,
	} as GHNode;
}
