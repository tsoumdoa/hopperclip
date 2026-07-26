import type { ParsedGrasshopper } from "parser/src/types";
import { diffComponents } from "./lib/gh-diff/component-diff";
import { indexDefinition } from "./lib/gh-diff/definition-index";
import { buildGraphOverlay } from "./lib/gh-diff/graph-overlay";
import {
	alignDefinitionsForMatchMode,
	type DiffMatchMode,
} from "./lib/gh-diff/match-align";
import type { GHDiffResult, GHDiffStatus } from "./types";

export type { DiffMatchMode };

const MIN_COMPONENT_OVERLAP = 0.25;
const MIN_MATCHES_FOR_LARGE_DEFINITION = 3;

export type DefinitionOverlap = {
	matchedCount: number;
	smallerCount: number;
	ratio: number;
	isComparable: boolean;
	matchMode: DiffMatchMode;
};

export type DiffComparisonResolution = {
	overlap: DefinitionOverlap;
	matchMode: DiffMatchMode;
	fellBackToType: boolean;
	result: GHDiffResult | null;
	failedTypeOverlap?: DefinitionOverlap;
};

function overlapFromCounts(
	matchedCount: number,
	beforeCount: number,
	afterCount: number,
	matchMode: DiffMatchMode
): DefinitionOverlap {
	const smallerCount = Math.min(beforeCount, afterCount);
	// With no components on one side there is no identity evidence with which
	// to reject the comparison. Treat it as a valid all-added/all-removed diff.
	const ratio = smallerCount === 0 ? 1 : matchedCount / smallerCount;
	const enoughMatches =
		smallerCount <= 5 || matchedCount >= MIN_MATCHES_FOR_LARGE_DEFINITION;

	return {
		matchedCount,
		smallerCount,
		ratio,
		isComparable: ratio >= MIN_COMPONENT_OVERLAP && enoughMatches,
		matchMode,
	};
}

type AlignedDefinitions = ReturnType<typeof alignDefinitionsForMatchMode>;

/**
 * Aligning is the expensive half of a comparison (it clones and re-keys the
 * after side), so overlap and the diff itself always share a single pass.
 */
function alignForMode(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper,
	matchMode: DiffMatchMode
): { aligned: AlignedDefinitions; overlap: DefinitionOverlap } {
	const aligned = alignDefinitionsForMatchMode(
		beforeDefinition,
		afterDefinition,
		matchMode
	);
	return {
		aligned,
		overlap: overlapFromCounts(
			aligned.matchedCount,
			Object.keys(beforeDefinition.components).length,
			Object.keys(afterDefinition.components).length,
			matchMode
		),
	};
}

export function assessDefinitionOverlap(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper,
	matchMode: DiffMatchMode = "instance"
): DefinitionOverlap {
	return alignForMode(beforeDefinition, afterDefinition, matchMode).overlap;
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

function diffFromAlignment(
	aligned: AlignedDefinitions,
	matchMode: DiffMatchMode
): GHDiffResult {
	const before = indexDefinition(aligned.before);
	const after = indexDefinition(aligned.after);
	const componentDiff = diffComponents(
		before,
		after,
		aligned.replacedInstanceKeys
	);
	const overlay = buildGraphOverlay(before, after, componentDiff.components);

	return {
		...componentDiff,
		...overlay,
		counts: countStatuses(componentDiff.components),
		matchMode,
	};
}

export function diffGrasshopper(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper,
	matchMode: DiffMatchMode = "instance"
): GHDiffResult {
	return diffFromAlignment(
		alignDefinitionsForMatchMode(beforeDefinition, afterDefinition, matchMode),
		matchMode
	);
}

/**
 * Resolve a comparison using the preferred match mode. When preferring
 * instance IDs, automatically fall back to type GUID matching if instance
 * overlap is too low — before rejecting the comparison as unrelated.
 */
export function resolveDiffComparison(
	beforeDefinition: ParsedGrasshopper,
	afterDefinition: ParsedGrasshopper,
	preferredMode: DiffMatchMode = "instance"
): DiffComparisonResolution {
	const preferred = alignForMode(
		beforeDefinition,
		afterDefinition,
		preferredMode
	);
	if (preferred.overlap.isComparable) {
		return {
			overlap: preferred.overlap,
			matchMode: preferredMode,
			fellBackToType: false,
			result: diffFromAlignment(preferred.aligned, preferredMode),
		};
	}

	if (preferredMode === "instance") {
		const byType = alignForMode(beforeDefinition, afterDefinition, "type");
		if (byType.overlap.isComparable) {
			return {
				overlap: byType.overlap,
				matchMode: "type",
				fellBackToType: true,
				result: diffFromAlignment(byType.aligned, "type"),
			};
		}

		return {
			overlap: preferred.overlap,
			matchMode: preferredMode,
			fellBackToType: false,
			result: null,
			failedTypeOverlap: byType.overlap,
		};
	}

	return {
		overlap: preferred.overlap,
		matchMode: preferredMode,
		fellBackToType: false,
		result: null,
	};
}

export function formatOverlapRejection(
	overlap: DefinitionOverlap,
	failedTypeOverlap?: DefinitionOverlap
): string {
	const modeLabel = overlap.matchMode === "type" ? "type GUID" : "instance ID";
	const base = `Only ${Math.round(overlap.ratio * 100)}% component overlap (${overlap.matchedCount} of ${overlap.smallerCount} matched by ${modeLabel}). Ducker requires at least 25% overlap${overlap.smallerCount > 5 ? " and 3 matched components" : ""}.`;
	if (failedTypeOverlap) {
		return `${base} Type GUID matching also fell short (${Math.round(failedTypeOverlap.ratio * 100)}% overlap, ${failedTypeOverlap.matchedCount} of ${failedTypeOverlap.smallerCount}).`;
	}
	if (overlap.matchMode === "instance") {
		return `${base} Try matching by type GUID if components were newly placed.`;
	}
	return base;
}
