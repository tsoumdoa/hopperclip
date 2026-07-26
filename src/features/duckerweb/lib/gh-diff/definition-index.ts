import type { Component, ParsedGrasshopper } from "parser/src/types";

export type DefinitionIndex = {
	definition: ParsedGrasshopper;
	componentsByKey: Map<string, Component>;
	identityById: Map<string, string>;
	componentIds: string[];
};

export function componentKey(component: Component): string {
	return component.instanceGuid || component.id;
}

export function indexDefinition(
	definition: ParsedGrasshopper
): DefinitionIndex {
	const components = Object.values(definition.components);

	return {
		definition,
		componentsByKey: new Map(
			components.map((component) => [componentKey(component), component])
		),
		identityById: new Map(
			components.map((component) => [component.id, componentKey(component)])
		),
		componentIds: components
			.map((component) => component.id)
			.sort((a, b) => b.length - a.length),
	};
}

export function resolveEndpointComponent(
	index: DefinitionIndex,
	endpoint: string
): string | undefined {
	return index.componentIds.find(
		(id) => endpoint === id || endpoint.startsWith(`${id}.`)
	);
}

export function endpointPortKey(
	endpoint: string,
	componentId: string
): string | undefined {
	return endpoint.startsWith(`${componentId}.`)
		? endpoint.slice(componentId.length + 1)
		: undefined;
}
