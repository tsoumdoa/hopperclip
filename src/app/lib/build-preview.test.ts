import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildGhJson } from "parser/src/parser";
import type { Component, ParsedGrasshopper } from "parser/src/types";
import { ghFileToGhXml } from "../utils/gh-file";
import { PREVIEW_CAPS, PREVIEW_KINDS } from "../../types/preview";
import { buildPreview } from "./build-preview";

function component(id: string, overrides: Partial<Component> = {}): Component {
	return {
		id,
		type: "Move",
		nickName: "Move",
		typeGuid: "type",
		instanceGuid: id,
		inputs: { A: { nick: "A", instanceGuid: `${id}-in` } },
		outputs: {},
		visuals: {
			bounds: { x: Number(id) * 10 || 0, y: -20, width: 10, height: 20 },
		},
		...overrides,
	};
}

test("builds a normalized digest from the real native GH fixture", async () => {
	const native = readFileSync(
		new URL("../utils/__fixtures__/native.gh", import.meta.url)
	);
	const xml = await ghFileToGhXml(new File([native], "native.gh"));
	const parsed = buildGhJson(xml, { includeVisuals: true });
	const preview = buildPreview(parsed);
	expect(preview.count).toBe(1);
	expect(preview.nodes).toHaveLength(5);
	expect(Math.max(...preview.nodes.slice(0, 4))).toBe(1000);
	expect(preview.nodes.every(Number.isInteger)).toBe(true);
	expect(buildPreview(parsed)).toEqual(preview);
});

test("counts unbounded components, excludes groups, classifies inputs/scripts/plugins and ranks operations", () => {
	const items = [
		component("a"),
		component("b"),
		component("c", { nickName: "Area", visuals: undefined }),
		component("slider", { value: { type: "slider" } }),
		component("toggle", { value: { type: "toggle" } }),
		component("list", { value: { type: "valueList" } }),
		component("panel", { type: "Panel" }),
		component("param", { type: "Number" }),
		component("relay", { description: "Contains a collection of geometry" }),
		component("scribble", { value: { type: "scribble" } }),
		component("script", {
			type: "Python 3 Script",
			script: { language: "python", code: "secret" },
		}),
		component("plugin", { nickName: "Mesh+", library: "Kangaroo v2.0" }),
		component("group", {
			type: "Group",
			visuals: {
				bounds: { x: -10, y: -30, width: 100, height: 100 },
				color: "127;12;34;56",
			},
		}),
	];
	const data = buildPreview({
		version: "1",
		components: Object.fromEntries(items.map((c) => [c.id, c])),
		wires: [
			{ from: "a.out", to: "b.in" },
			{ from: "c.out", to: "b.in" },
		],
		metadata: {
			libraries: [
				{ name: "Grasshopper", version: "1" },
				{ name: "Kangaroo", version: "2" },
			],
		},
	});
	expect(data.count).toBe(12);
	expect(data.inputs).toEqual({ sliders: 1, toggles: 1, lists: 1 });
	expect(data.keyComponents).toEqual(["Move", "Area", "Mesh+"]);
	expect(data.scripts).toEqual(["Python 3"]);
	expect(data.plugins).toEqual(["Kangaroo"]);
	expect(data.edges).toEqual([0, 1]);
	expect(data.groups[0].color).toBe("#0c2238");
	expect(data.nodes[2 * 5 + 4]).toBe(PREVIEW_KINDS.indexOf("input"));
	expect(data.nodes[9 * 5 + 4]).toBe(PREVIEW_KINDS.indexOf("script"));
	expect(data.nodes[10 * 5 + 4]).toBe(PREVIEW_KINDS.indexOf("plugin"));
});

test("caps all arrays and names, evenly samples nodes including both ends, and keeps only sampled edges", () => {
	const components = Array.from({ length: 1001 }, (_, i) =>
		component(String(i), {
			nickName: `Operation ${i} ${"x".repeat(60)}`,
			library: `Plugin ${i}`,
			...(i % 100 === 0 ? { type: `Custom ${i} Script` } : {}),
		})
	);
	const groups = Array.from({ length: 50 }, (_, i) =>
		component(`g${i}`, { type: "Group" })
	);
	const parsed: ParsedGrasshopper = {
		version: "1",
		components: Object.fromEntries(
			[...components, ...groups].map((c) => [c.id, c])
		),
		wires: [
			{ from: "1.out", to: "1000.in" },
			...Array.from({ length: 1000 }, () => ({ from: "0.out", to: "1000.in" })),
		],
	};
	const data = buildPreview(parsed);
	expect(data.count).toBe(1001);
	expect(data.nodes).toHaveLength(PREVIEW_CAPS.nodes * 5);
	expect(data.edges).toHaveLength(PREVIEW_CAPS.edges * 2);
	expect(data.groups).toHaveLength(PREVIEW_CAPS.groups);
	expect(data.keyComponents).toHaveLength(PREVIEW_CAPS.keyComponents);
	expect(data.scripts).toHaveLength(PREVIEW_CAPS.scripts);
	expect(data.plugins).toHaveLength(PREVIEW_CAPS.plugins);
	expect(
		[...data.keyComponents, ...data.scripts, ...data.plugins].every(
			(s) => s.length <= PREVIEW_CAPS.nameLength
		)
	).toBe(true);
	expect(data.edges.every((n, i) => n === (i % 2 ? 399 : 0))).toBe(true);
	for (let i = 0; i < PREVIEW_CAPS.nodes; i++) {
		const original = Math.floor((i * 1000) / 399);
		expect(data.nodes[i * 5]).toBe(Math.round((original * 10 * 1000) / 10010));
	}
	expect(buildPreview(parsed)).toEqual(data);
});

test("empty and invalid geometry stay finite without losing counts", () => {
	expect(
		buildPreview({ version: "1", components: {}, wires: [] }).nodes
	).toEqual([]);
	const data = buildPreview({
		version: "1",
		components: {
			a: component("a", {
				visuals: { bounds: { x: NaN, y: 0, width: 10, height: 10 } },
			}),
			b: component("b", { visuals: undefined }),
		},
		wires: [],
	});
	expect(data.count).toBe(2);
	expect(data.nodes).toEqual([]);
});

test("normalizes sub-unit bounds and handles a single point without division by zero", () => {
	const build = (width: number, height: number) =>
		buildPreview({
			version: "1",
			components: {
				a: component("a", {
					visuals: { bounds: { x: -1, y: -1, width, height } },
				}),
			},
			wires: [],
		});
	expect(build(0.5, 0.25).nodes).toEqual([0, 0, 1000, 500, 0]);
	expect(build(0, 0).nodes).toEqual([0, 0, 0, 0, 0]);
});
