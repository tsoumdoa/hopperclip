import type { Component, InputPort } from "parser/src/types";
import type { GHComponentDiff, GHDiffStatus } from "../../types/type";
import type { DefinitionIndex } from "./definition-index";
import { deepEqual } from "./deep-equal";

type ComponentContext = {
	component: Component;
	definition: DefinitionIndex;
};

type ChangeRule = {
	label: string;
	changed: (before: ComponentContext, after: ComponentContext) => boolean;
};

const POSITION_TOLERANCE = 2;
const COMPONENT_DETAIL_KEYS = [
	"type",
	"typeGuid",
	"nickName",
	"library",
	"description",
] as const;
const EXPRESSION_KEYS = ["expression", "internalExpression"] as const;
const STATE_KEYS = ["hidden", "locked", "frozen"] as const;

const byInstanceGuid = <T extends { instanceGuid: string }>(a: T, b: T) =>
	a.instanceGuid.localeCompare(b.instanceGuid);

function withoutConnections({
	source: _source,
	sources: _sources,
	...settings
}: InputPort) {
	return settings;
}

function portSettings(component: Component) {
	return {
		inputs: Object.values(component.inputs)
			.map(withoutConnections)
			.sort(byInstanceGuid),
		outputs: Object.values(component.outputs).sort(byInstanceGuid),
	};
}

function memberIdentities({
	component,
	definition,
}: ComponentContext): string[] {
	return (component.members ?? [])
		.map((id) => definition.identityById.get(id) ?? id)
		.sort();
}

function componentFieldsChanged(
	before: Component,
	after: Component,
	keys: readonly (keyof Component)[]
): boolean {
	return keys.some((key) => before[key] !== after[key]);
}

function runtimeStateChanged(before: Component, after: Component): boolean {
	return STATE_KEYS.some((key) => before.state?.[key] !== after.state?.[key]);
}

function runtimeStateChanges(before: Component, after: Component): string[] {
	const labels = {
		hidden: { on: "Hidden (visibility off)", off: "Visible (visibility on)" },
		locked: { on: "Locked", off: "Unlocked" },
		frozen: { on: "Frozen", off: "Unfrozen" },
	} as const;
	return STATE_KEYS.flatMap((key) => {
		const oldValue = Boolean(before.state?.[key]);
		const newValue = Boolean(after.state?.[key]);
		if (oldValue === newValue) return [];
		return [labels[key][newValue ? "on" : "off"]];
	});
}

/**
 * The semantic diff policy. Visuals, selection, and wire sources are absent on
 * purpose: layout is reported separately and connections have their own diff.
 */
const CHANGE_RULES: readonly ChangeRule[] = [
	{
		label: "Component details",
		changed: (before, after) =>
			componentFieldsChanged(
				before.component,
				after.component,
				COMPONENT_DETAIL_KEYS
			),
	},
	{
		label: "Port settings",
		changed: (before, after) =>
			!deepEqual(portSettings(before.component), portSettings(after.component)),
	},
	{
		label: "Value",
		changed: (before, after) =>
			!deepEqual(before.component.value, after.component.value),
	},
	{
		label: "Expression",
		changed: (before, after) =>
			componentFieldsChanged(
				before.component,
				after.component,
				EXPRESSION_KEYS
			),
	},
	{
		label: "Script",
		changed: (before, after) =>
			!deepEqual(before.component.script, after.component.script),
	},
	{
		label: "Cluster contents",
		changed: (before, after) =>
			!deepEqual(before.component.cluster, after.component.cluster),
	},
	{
		label: "Group membership",
		changed: (before, after) =>
			!deepEqual(memberIdentities(before), memberIdentities(after)),
	},
];

function changedFacets(
	before: ComponentContext,
	after: ComponentContext
): string[] {
	const changes = CHANGE_RULES.filter((rule) =>
		rule.changed(before, after)
	).map((rule) => rule.label);
	if (runtimeStateChanged(before.component, after.component)) {
		changes.push(...runtimeStateChanges(before.component, after.component));
	}
	return changes;
}

function position(component: Component) {
	return component.visuals?.pivot ?? component.visuals?.bounds;
}

function hasMoved(before: Component, after: Component): boolean {
	const a = position(before);
	const b = position(after);
	return Boolean(
		a &&
		b &&
		(Math.abs(a.x - b.x) > POSITION_TOLERANCE ||
			Math.abs(a.y - b.y) > POSITION_TOLERANCE)
	);
}

function presenceDiff(
	key: string,
	component: Component,
	status: "added" | "removed"
): GHComponentDiff {
	return {
		key,
		label: component.nickName,
		type: component.type,
		status,
		changes: [`Component ${status}`],
		layoutMoved: false,
	};
}

const STATUS_ORDER: Record<GHDiffStatus, number> = {
	modified: 0,
	added: 1,
	removed: 2,
	unchanged: 3,
};

export function diffComponents(
	before: DefinitionIndex,
	after: DefinitionIndex
): { components: GHComponentDiff[]; layoutMoves: number } {
	const keys = new Set([
		...before.componentsByKey.keys(),
		...after.componentsByKey.keys(),
	]);
	const components: GHComponentDiff[] = [];
	let layoutMoves = 0;

	for (const key of keys) {
		const oldComponent = before.componentsByKey.get(key);
		const newComponent = after.componentsByKey.get(key);

		if (!oldComponent && newComponent) {
			components.push(presenceDiff(key, newComponent, "added"));
			continue;
		}
		if (oldComponent && !newComponent) {
			components.push(presenceDiff(key, oldComponent, "removed"));
			continue;
		}
		if (!oldComponent || !newComponent) continue;

		const changes = changedFacets(
			{ component: oldComponent, definition: before },
			{ component: newComponent, definition: after }
		);
		const layoutMoved = hasMoved(oldComponent, newComponent);
		if (layoutMoved) layoutMoves += 1;
		components.push({
			key,
			label: newComponent.nickName,
			type: newComponent.type,
			status: changes.length > 0 ? "modified" : "unchanged",
			changes,
			layoutMoved,
		});
	}

	components.sort(
		(a, b) =>
			STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
			a.label.localeCompare(b.label)
	);

	return { components, layoutMoves };
}
