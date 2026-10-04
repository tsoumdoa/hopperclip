import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { describe, expect, test } from "vitest";
import { diffGrasshopper, resolveDiffComparison } from "./gh-diff";
import { NEWLY_PLACED_CHANGE } from "./lib/gh-diff/component-diff";

function fixture(path: string): ParsedGrasshopper {
	return buildGhJson(fs.readFileSync(path, "utf8"), {
		includeVisuals: true,
	});
}

function clone(parsed: ParsedGrasshopper): ParsedGrasshopper {
	return structuredClone(parsed);
}

function reinstanceAll(definition: ParsedGrasshopper, prefix: string) {
	const inputPortIds = new Set(
		Object.values(definition.components).flatMap((component) =>
			Object.values(component.inputs).map((port) => port.instanceGuid)
		)
	);
	const outputPortIds = new Set(
		Object.values(definition.components).flatMap((component) =>
			Object.values(component.outputs).map((port) => port.instanceGuid)
		)
	);
	const componentIds = new Set(
		Object.values(definition.components).map(
			(component) => component.instanceGuid || component.id
		)
	);
	for (const component of Object.values(definition.components)) {
		component.instanceGuid = `${prefix}-${component.instanceGuid}`;
		for (const port of Object.values(component.inputs)) {
			port.instanceGuid = `${prefix}-in-${port.instanceGuid}`;
		}
		for (const port of Object.values(component.outputs)) {
			port.instanceGuid = `${prefix}-out-${port.instanceGuid}`;
		}
	}
	for (const wire of definition.wires) {
		if (wire.sourceComponentGuid) {
			if (outputPortIds.has(wire.sourceComponentGuid)) {
				wire.sourceComponentGuid = `${prefix}-out-${wire.sourceComponentGuid}`;
			} else if (componentIds.has(wire.sourceComponentGuid)) {
				wire.sourceComponentGuid = `${prefix}-${wire.sourceComponentGuid}`;
			}
		}
		if (wire.targetPortGuid) {
			const portPrefix = inputPortIds.has(wire.targetPortGuid)
				? `${prefix}-in-`
				: `${prefix}-out-`;
			wire.targetPortGuid = `${portPrefix}${wire.targetPortGuid}`;
		}
	}
}

describe("diffGrasshopper", () => {
	test("ignores layout and selection changes while reporting the movement", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		const component = Object.values(after.components).find(
			(candidate) => candidate.visuals?.bounds
		);
		expect(component?.visuals?.bounds).toBeDefined();
		if (!component?.visuals?.bounds) return;

		component.visuals.bounds.x += 180;
		component.visuals.bounds.y += 90;
		if (component.visuals.pivot) {
			component.visuals.pivot.x += 180;
			component.visuals.pivot.y += 90;
		}
		component.state = {
			...component.state,
			selected: !component.state?.selected,
		};

		const diff = diffGrasshopper(before, after);

		expect(diff.counts.modified).toBe(0);
		expect(diff.counts.added).toBe(0);
		expect(diff.counts.removed).toBe(0);
		expect(diff.layoutMoves).toBe(1);
		expect(diff.matchMode).toBe("instance");
	});

	test("reports parameter changes as modified logic", () => {
		const before = fixture("parser/sand/xmls/slider.xml");
		const after = clone(before);
		const slider = Object.values(after.components).find(
			(component) => component.value?.type === "slider"
		);
		expect(slider?.value).toBeDefined();
		if (!slider?.value) return;

		slider.value.current = (slider.value.current ?? 0) + 1;
		const diff = diffGrasshopper(before, after);
		const modified = diff.components.find(
			(component) => component.status === "modified"
		);

		expect(diff.counts.modified).toBe(1);
		expect(modified?.changes).toContain("Value");
	});

	test("reports rewiring independently from component changes", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		after.wires = [];

		const diff = diffGrasshopper(before, after);

		expect(diff.removedWires).toBe(before.wires.length);
		expect(diff.addedWires).toBe(0);
		expect(diff.counts.modified).toBe(0);
		expect(
			diff.edges.filter((edge) => edge.data?.diffStatus === "removed")
		).toHaveLength(before.wires.length);
	});

	test("auto-falls back to type GUID matching when instance overlap is too low", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		reinstanceAll(after, "placed");

		const resolution = resolveDiffComparison(before, after, "instance");

		expect(resolution.fellBackToType).toBe(true);
		expect(resolution.matchMode).toBe("type");
		expect(resolution.result).not.toBeNull();
		expect(resolution.result?.matchMode).toBe("type");
		expect(resolution.result?.counts.added).toBe(0);
		expect(resolution.result?.counts.removed).toBe(0);
		expect(resolution.result?.counts.modified).toBe(
			Object.keys(before.components).length
		);
		expect(
			resolution.result?.components.every((component) =>
				component.changes.includes(NEWLY_PLACED_CHANGE)
			)
		).toBe(true);
		expect(resolution.result?.addedWires).toBe(0);
		expect(resolution.result?.removedWires).toBe(0);
	});

	test("never drops a component when a reused GUID would collide", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		const [firstBefore, secondBefore] = Object.values(before.components);
		const [firstAfter, secondAfter] = Object.values(after.components);
		// The after side has no counterpart for the first component's type, yet it
		// reuses the second component's GUID. Re-keying the second pair onto that
		// GUID would collide and silently drop one of the two from the diff.
		firstAfter.typeGuid = "unrelated-type";
		firstAfter.type = "UnrelatedType";
		firstAfter.instanceGuid = secondBefore.instanceGuid;
		secondAfter.instanceGuid = "freshly-placed";

		const diff = diffGrasshopper(before, after, "type");

		expect(diff.components.map((item) => item.key).sort()).toEqual(
			[
				firstBefore.instanceGuid,
				secondBefore.instanceGuid,
				"freshly-placed",
			].sort()
		);
	});
});
