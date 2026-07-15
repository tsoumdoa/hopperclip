import fs from "node:fs";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { describe, expect, test } from "vitest";
import { assessDefinitionOverlap, diffGrasshopper } from "./gh-diff";

function fixture(path: string): ParsedGrasshopper {
	return buildGhJson(fs.readFileSync(path, "utf8"), {
		includeVisuals: true,
	});
}

function clone(parsed: ParsedGrasshopper): ParsedGrasshopper {
	return structuredClone(parsed);
}

describe("diffGrasshopper", () => {
	test("rejects definitions with less than 25% component overlap", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		for (const component of Object.values(after.components)) {
			component.instanceGuid = `different-${component.instanceGuid}`;
		}

		const overlap = assessDefinitionOverlap(before, after);

		expect(overlap.ratio).toBe(0);
		expect(overlap.isComparable).toBe(false);
	});

	test("accepts definitions at the 25% overlap boundary", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		const components = Object.values(after.components);
		components.slice(1).forEach((component) => {
			component.instanceGuid = `different-${component.instanceGuid}`;
		});

		const overlap = assessDefinitionOverlap(before, after);

		expect(overlap.ratio).toBeGreaterThanOrEqual(0.25);
		expect(overlap.isComparable).toBe(true);
	});

	test.each([
		["all-added", false],
		["all-removed", true],
	] as const)(
		"accepts an %s comparison with an empty definition",
		(_, swap) => {
			const populated = fixture("parser/sand/xmls/brep-area-Wire.xml");
			const empty = clone(populated);
			empty.components = {};
			empty.wires = [];
			const before = swap ? populated : empty;
			const after = swap ? empty : populated;

			const overlap = assessDefinitionOverlap(before, after);
			const diff = diffGrasshopper(before, after);

			expect(overlap.ratio).toBe(1);
			expect(overlap.isComparable).toBe(true);
			expect(swap ? diff.counts.removed : diff.counts.added).toBe(
				Object.keys(populated.components).length
			);
		}
	);

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

	test("describes changes using semantic facet labels", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		const component = Object.values(after.components)[0];
		component.nickName = `${component.nickName} revised`;
		component.state = { ...component.state, locked: !component.state?.locked };

		const diff = diffGrasshopper(before, after);
		const modified = diff.components.find(
			(item) => item.key === component.instanceGuid
		);

		expect(modified?.changes).toEqual(["Component details", "Locked"]);
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

	test("does not count unresolved wires that cannot be presented", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		const target = Object.values(after.components).find(
			(component) => Object.keys(component.inputs).length > 0
		);
		expect(target).toBeDefined();
		if (!target) return;
		const [inputKey, input] = Object.entries(target.inputs)[0];
		after.wires.push({
			from: "missing-source-guid",
			to: `${target.id}.${inputKey}`,
			sourceComponentGuid: "missing-source-guid",
			targetPortGuid: input.instanceGuid,
		});

		const added = diffGrasshopper(before, after);
		const removed = diffGrasshopper(after, before);

		expect(added.addedWires).toBe(0);
		expect(removed.removedWires).toBe(0);
		expect(
			added.edges.filter((edge) => edge.data?.diffStatus === "added")
		).toHaveLength(0);
	});

	test("reports added and removed components by stable instance ID", () => {
		const before = fixture("parser/sand/xmls/brep-area-Wire.xml");
		const after = clone(before);
		const removed = Object.values(after.components)[0];
		delete after.components[removed.id];
		const added = structuredClone(Object.values(before.components)[1]);
		added.id = `${added.id}_new`;
		added.instanceGuid = "new-component-guid";
		after.components[added.id] = added;

		const diff = diffGrasshopper(before, after);

		expect(diff.counts.added).toBe(1);
		expect(diff.counts.removed).toBe(1);
	});
});
