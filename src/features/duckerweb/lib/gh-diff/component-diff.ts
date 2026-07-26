import type {
	Component,
	DataMapping,
	InputPort,
	OutputPort,
	PortOptions,
} from "parser/src/types";
import type { GHComponentDiff, GHDiffStatus } from "../../types";
import type { DefinitionIndex } from "./definition-index";
import { deepEqual } from "./deep-equal";

type ComponentContext = {
	component: Component;
	definition: DefinitionIndex;
};

type ChangeRule =
	| {
			label: string;
			changed: (before: ComponentContext, after: ComponentContext) => boolean;
	  }
	| {
			describe: (before: ComponentContext, after: ComponentContext) => string[];
	  };

type DiffablePort = InputPort | OutputPort;

const POSITION_TOLERANCE = 2;
const COMPONENT_DETAIL_KEYS = [
	"type",
	"typeGuid",
	"nickName",
	"library",
	"description",
] as const;
const COMPONENT_DETAIL_LABELS: Record<
	(typeof COMPONENT_DETAIL_KEYS)[number],
	string
> = {
	type: "Type",
	typeGuid: "Type GUID",
	nickName: "Nickname",
	library: "Library",
	description: "Description",
};
const EXPRESSION_KEYS = ["expression", "internalExpression"] as const;
const STATE_KEYS = ["hidden", "locked", "frozen"] as const;
export const NEWLY_PLACED_CHANGE = "Same component, newly placed";

const PORT_OPTION_LABELS: Record<
	Exclude<keyof PortOptions, "mapping" | "expression">,
	string
> = {
	simplify: "Simplify",
	reverse: "Reverse",
	reparameterize: "Reparameterize",
	unitize: "Unitize",
};

function portName(kind: "Input" | "Output", port: DiffablePort) {
	return `${kind} ${port.nick || port.instanceGuid.slice(0, 8)}`;
}

function mappingLabel(mapping: DataMapping | undefined) {
	if (!mapping) return "default";
	return mapping[0].toUpperCase() + mapping.slice(1);
}

function descriptionChange(before?: string, after?: string) {
	if (before === after) return [];
	if (!before) return ["Description added"];
	if (!after) return ["Description removed"];
	return ["Description changed"];
}

function expressionChange(before?: string, after?: string) {
	if (before === after) return [];
	if (!before) return ["Expression added"];
	if (!after) return ["Expression removed"];
	return ["Expression changed"];
}

function portOptionChanges(before?: PortOptions, after?: PortOptions) {
	const changes: string[] = [];
	if (before?.mapping !== after?.mapping) {
		changes.push(
			`Mapping ${mappingLabel(before?.mapping)} → ${mappingLabel(after?.mapping)}`
		);
	}
	for (const [key, label] of Object.entries(PORT_OPTION_LABELS) as [
		keyof typeof PORT_OPTION_LABELS,
		string,
	][]) {
		if (Boolean(before?.[key]) !== Boolean(after?.[key])) {
			changes.push(`${label} ${after?.[key] ? "on" : "off"}`);
		}
	}
	changes.push(...expressionChange(before?.expression, after?.expression));
	return changes;
}

function changedPort(
	kind: "Input" | "Output",
	before: DiffablePort,
	after: DiffablePort
) {
	const changes: string[] = [];
	if (before.nick !== after.nick) {
		changes.push(`Renamed ${before.nick} → ${after.nick}`);
	}
	changes.push(...descriptionChange(before.description, after.description));
	if (Boolean(before.optional) !== Boolean(after.optional)) {
		changes.push(after.optional ? "Optional" : "Required");
	}
	changes.push(...portOptionChanges(before.options, after.options));
	return changes.length > 0
		? [`${portName(kind, after)}: ${changes.join(", ")}`]
		: [];
}

function portChangesForKind(
	kind: "Input" | "Output",
	beforePorts: Record<string, DiffablePort>,
	afterPorts: Record<string, DiffablePort>
) {
	const beforeById = new Map(
		Object.values(beforePorts).map((port) => [port.instanceGuid, port])
	);
	const afterById = new Map(
		Object.values(afterPorts).map((port) => [port.instanceGuid, port])
	);
	const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();

	return ids.flatMap((id) => {
		const before = beforeById.get(id);
		const after = afterById.get(id);
		if (!before && after) return [`${portName(kind, after)} added`];
		if (before && !after) return [`${portName(kind, before)} removed`];
		if (!before || !after) return [];
		return changedPort(kind, before, after);
	});
}

function portSettingChanges(before: Component, after: Component) {
	return [
		...portChangesForKind("Input", before.inputs, after.inputs),
		...portChangesForKind("Output", before.outputs, after.outputs),
	];
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

function componentDetailChanges(before: Component, after: Component): string[] {
	return COMPONENT_DETAIL_KEYS.flatMap((key) => {
		if (before[key] === after[key]) return [];
		const label = COMPONENT_DETAIL_LABELS[key];
		if (key === "description")
			return descriptionChange(before[key], after[key]);
		if (!before[key]) return [`${label} added`];
		if (!after[key]) return [`${label} removed`];
		if (key === "nickName" || key === "type" || key === "library") {
			return [`${label} ${before[key]} → ${after[key]}`];
		}
		return [`${label} changed`];
	});
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
		describe: (before, after) =>
			componentDetailChanges(before.component, after.component),
	},
	{
		describe: (before, after) =>
			portSettingChanges(before.component, after.component),
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
	const changes = CHANGE_RULES.flatMap((rule) => {
		if ("describe" in rule) return rule.describe(before, after);
		return rule.changed(before, after) ? [rule.label] : [];
	});
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
	after: DefinitionIndex,
	replacedInstanceKeys: ReadonlySet<string> = new Set()
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
		if (replacedInstanceKeys.has(key)) {
			changes.unshift(NEWLY_PLACED_CHANGE);
		}
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
