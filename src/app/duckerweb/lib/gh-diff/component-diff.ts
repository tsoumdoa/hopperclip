import type { Component, InputPort } from "parser/src/types";
import type { GHComponentDiff, GHDiffStatus } from "../../types/type";
import type { DefinitionIndex } from "./definition-index";
import { semanticEqual } from "./semantic-equality";

type ComponentContext = {
	component: Component;
	definition: DefinitionIndex;
};

type SemanticFacet = {
	label: string;
	read: (context: ComponentContext) => unknown;
};

const POSITION_TOLERANCE = 2;

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

/**
 * The semantic diff policy. Visuals, selection, and wire sources are absent on
 * purpose: layout is reported separately and connections have their own diff.
 */
const SEMANTIC_FACETS: readonly SemanticFacet[] = [
	{
		label: "Component details",
		read: ({ component }) => ({
			type: component.type,
			typeGuid: component.typeGuid,
			nickName: component.nickName,
			library: component.library,
			description: component.description,
		}),
	},
	{
		label: "Port settings",
		read: ({ component }) => portSettings(component),
	},
	{ label: "Value", read: ({ component }) => component.value },
	{
		label: "Expression",
		read: ({ component }) => ({
			expression: component.expression,
			internal: component.internalExpression,
		}),
	},
	{ label: "Script", read: ({ component }) => component.script },
	{ label: "Cluster contents", read: ({ component }) => component.cluster },
	{ label: "Group membership", read: memberIdentities },
	{
		label: "Runtime state",
		read: ({ component }) => ({
			hidden: component.state?.hidden,
			locked: component.state?.locked,
			frozen: component.state?.frozen,
		}),
	},
];

function changedFacets(
	before: ComponentContext,
	after: ComponentContext
): string[] {
	return SEMANTIC_FACETS.filter(
		(facet) => !semanticEqual(facet.read(before), facet.read(after))
	).map((facet) => facet.label);
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
		if (hasMoved(oldComponent, newComponent)) layoutMoves += 1;
		components.push({
			key,
			label: newComponent.nickName,
			type: newComponent.type,
			status: changes.length > 0 ? "modified" : "unchanged",
			changes,
		});
	}

	components.sort(
		(a, b) =>
			STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
			a.label.localeCompare(b.label)
	);

	return { components, layoutMoves };
}
