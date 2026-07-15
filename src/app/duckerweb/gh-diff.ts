import type { ParsedGrasshopper } from "parser/src/types";
import { diffComponents } from "./lib/gh-diff/component-diff";
import { indexDefinition } from "./lib/gh-diff/definition-index";
import { buildGraphOverlay } from "./lib/gh-diff/graph-overlay";
import type { GHDiffResult, GHDiffStatus } from "./types/type";

const MIN_COMPONENT_OVERLAP = 0.25;
const MIN_MATCHES_FOR_LARGE_DEFINITION = 3;

export type DefinitionOverlap = {
	matchedCount: number;
	smallerCount: number;
	ratio: number;
	isComparable: boolean;
};

export function assessDefinitionOverlap(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper
): DefinitionOverlap {
	const before = indexDefinition(beforeDefinition);
	const after = indexDefinition(afterDefinition);
	const smallerCount = Math.min(
		before.componentsByKey.size,
		after.componentsByKey.size
	);
	const matchedCount = [...before.componentsByKey.keys()].filter((key) =>
		after.componentsByKey.has(key)
	).length;
	const bothEmpty =
		before.componentsByKey.size === 0 && after.componentsByKey.size === 0;
	const ratio = bothEmpty
		? 1
		: smallerCount === 0
			? 0
			: matchedCount / smallerCount;
	const enoughMatches =
		smallerCount <= 5 || matchedCount >= MIN_MATCHES_FOR_LARGE_DEFINITION;

	return {
		matchedCount,
		smallerCount,
		ratio,
		isComparable: ratio >= MIN_COMPONENT_OVERLAP && enoughMatches,
	};
}

function countStatuses(
	components: GHDiffResult["components"]
): Record<GHDiffStatus, number> {
	const counts: Record<GHDiffStatus, number> = {
		added: 0,
		modified: 0,
		removed: 0,
		unchanged: 0,
	};

	for (const component of components) counts[component.status] += 1;
	return counts;
}

export function diffGrasshopper(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper
): GHDiffResult {
	const before = indexDefinition(beforeDefinition);
	const after = indexDefinition(afterDefinition);
	const componentDiff = diffComponents(before, after);
	const overlay = buildGraphOverlay(before, after, componentDiff.components);

	return {
		...componentDiff,
		...overlay,
		counts: countStatuses(componentDiff.components),
	};
}
