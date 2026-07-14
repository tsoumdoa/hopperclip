import type { ParsedGrasshopper } from "parser/src/types";
import { diffComponents } from "./lib/gh-diff/component-diff";
import { indexDefinition } from "./lib/gh-diff/definition-index";
import { buildGraphOverlay } from "./lib/gh-diff/graph-overlay";
import type { GHDiffResult, GHDiffStatus } from "./types/type";

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
