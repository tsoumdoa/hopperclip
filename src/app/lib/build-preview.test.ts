import { getMainScriptNickName } from "../components/gh-card-xml-paste";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildGhJson } from "parser/src/parser";
import type { Component, ParsedGrasshopper } from "parser/src/types";
import { ghFileToGhXml } from "../utils/gh-file";
import { PREVIEW_CAPS, PREVIEW_KINDS } from "../../types/preview";
import { buildPreview, getSignatureScript } from "./build-preview";

const CANVAS_GROUP_GUID = "c552a431-af5b-46a9-a8a4-0fcbc27ef596";

function fixture(name: string) {
	return buildGhJson(readFileSync(`parser/sand/xmls/${name}`, "utf8"), {
		includeVisuals: true,
	});
}

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
			typeGuid: CANVAS_GROUP_GUID,
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
	expect(data.scriptCount).toBe(1);
	expect(data.plugins).toEqual(["Kangaroo"]);
	expect(data.pluginCount).toBe(1);
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
		component(`g${i}`, { type: "Group", typeGuid: CANVAS_GROUP_GUID })
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
	expect(data.scriptCount).toBe(11);
	expect(data.pluginCount).toBe(1001);
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

test.each([
	["three-grouped.xml", 1],
	["multi-groups.xml", 3],
	["riley-and-group.xml", 1],
] as const)("derives enclosing group rectangles from %s", (name, count) => {
	const parsed = fixture(name);
	const original = structuredClone(parsed);
	const preview = buildPreview(parsed);
	const all = Object.values(parsed.components);
	const groups = all.filter((c) => c.typeGuid === CANVAS_GROUP_GUID);
	const nodes = all.filter(
		(c) => c.typeGuid !== CANVAS_GROUP_GUID && c.visuals?.bounds
	);
	expect(nodes.length).toBeLessThanOrEqual(PREVIEW_CAPS.nodes);
	expect(preview.groups).toHaveLength(count);
	for (const [i, group] of groups.entries()) {
		expect(group.visuals?.bounds).toBeUndefined();
		expect(group.members?.length).toBeGreaterThan(0);
		const rect = preview.groups[i];
		for (const id of group.members ?? []) {
			const memberGroup = groups.findIndex((c) => c.id === id);
			const node = nodes.findIndex((c) => c.id === id);
			const nested = preview.groups[memberGroup];
			const [x, y, w, h] =
				memberGroup >= 0
					? [nested.x, nested.y, nested.w, nested.h]
					: preview.nodes.slice(node * 5, node * 5 + 4);
			expect(memberGroup >= 0 || node >= 0).toBe(true);
			expect(rect.x).toBeLessThanOrEqual(x);
			expect(rect.y).toBeLessThanOrEqual(y);
			expect(rect.x + rect.w).toBeGreaterThanOrEqual(x + w - 1);
			expect(rect.y + rect.h).toBeGreaterThanOrEqual(y + h - 1);
		}
	}
	expect(parsed).toEqual(original);
});

test("recurses into nested groups and terminates on cyclic or missing members", () => {
	const items = [
		component("a"),
		component("inner", {
			type: "Group",
			typeGuid: CANVAS_GROUP_GUID,
			members: ["a", "outer", "missing"],
			visuals: undefined,
		}),
		component("outer", {
			type: "Group",
			typeGuid: CANVAS_GROUP_GUID,
			members: ["inner"],
			visuals: undefined,
		}),
	];
	const parsed = {
		version: "1",
		components: Object.fromEntries(items.map((c) => [c.id, c])),
		wires: [],
	};
	const data = buildPreview(parsed);
	expect(data.groups).toHaveLength(2);
	expect(data.groups[1].w).toBeGreaterThan(data.groups[0].w);
	expect(data.groups[1].h).toBeGreaterThan(data.groups[0].h);
	expect(data.nodes.every(Number.isFinite)).toBe(true);
	expect(buildPreview(parsed)).toEqual(data);
});

test("counts the real Group operation and Grp parameter as nodes and keeps their wires", () => {
	const parsed = fixture("all.xml");
	const operation = Object.values(parsed.components).find(
		(c) => c.typeGuid === "874eebe7-835b-4f4f-9811-97e031c41597"
	)!;
	const param = Object.values(parsed.components).find(
		(c) => c.typeGuid === "b0851fc0-ab55-47d8-bdda-cc6306a40176"
	)!;
	expect(operation.type).toBe("Group");
	expect(param.type).toBe("Group");
	const data = buildPreview({
		...parsed,
		components: { [operation.id]: operation, [param.id]: param },
		wires: [{ from: `${operation.id}.G`, to: `${param.id}.G` }],
	});
	expect(data.count).toBe(2);
	expect(data.nodes).toHaveLength(10);
	expect(data.keyComponents).toContain(operation.nickName);
	expect(data.edges).toEqual([0, 1]);
	expect(data.groups).toEqual([]);
});

test("keeps real Group-component wires and the .01ChildCutter edge", () => {
	const parsed = fixture(
		"user_2wqbnxvyl1Wpms6P31fLGrwH2c3_w01KJ2ROEV8GrxvrtHv1A.xml"
	);
	const components = Object.values(parsed.components).filter(
		(c) => c.typeGuid !== CANVAS_GROUP_GUID
	);
	const operation = components.find(
		(c) => c.typeGuid === "874eebe7-835b-4f4f-9811-97e031c41597"
	)!;
	expect(components.length).toBeLessThan(PREVIEW_CAPS.nodes);
	expect(parsed.wires).toContainEqual(
		expect.objectContaining({
			from: ".01ChildCutter.content",
			to: "Partition.l",
		})
	);
	const data = buildPreview(parsed);
	expect(data.count).toBe(components.length);
	const index = (id: string) => components.findIndex((c) => c.id === id);
	// Three other wires point outside the copied fixture and are omitted.
	expect(data.edges).toEqual([
		index(".01ChildCutter"),
		index("Partition"),
		index("TStat"),
		index("Partition"),
		index("Path Mapper"),
		index(operation.id),
		index(operation.id),
		index("Trim"),
		index("Partition"),
		index("Path Mapper"),
	]);
});

test("resolves dotted component ids by longest prefix without miswiring A.B to A", () => {
	const items = [component("A"), component("A.B"), component("target")];
	const data = buildPreview({
		version: "1",
		components: Object.fromEntries(items.map((c) => [c.id, c])),
		wires: [
			{ from: "A.B.out", to: "target.in" },
			{ from: "A.out", to: "A.B.in" },
		],
	});
	expect(data.edges).toEqual([1, 2, 0, 1]);
});

test("keeps distinct totals beyond stored name caps and before truncating names", () => {
	const prefix = "x".repeat(PREVIEW_CAPS.nameLength);
	const items = [
		"Alpha",
		"Beta",
		"Gamma",
		`${prefix}A`,
		`${prefix}B`,
		"Alpha",
	].map((name, i) =>
		component(String(i), {
			type: `${name} Script`,
			library: `${name} v1.0`,
		})
	);
	const data = buildPreview({
		version: "1",
		components: Object.fromEntries(items.map((c) => [c.id, c])),
		wires: [],
		metadata: { libraries: [{ name: "Alpha v2.0", version: "2" }] },
	});
	expect(data.scriptCount).toBe(5);
	expect(data.pluginCount).toBe(5);
	expect(data.scripts).toEqual(["Alpha Script", "Beta Script", "Gamma Script"]);
	expect(data.plugins).toEqual(["Alpha", "Beta", "Gamma"]);
});

test("counts all four non-core libraries from all.xml while storing only three", () => {
	const data = buildPreview(fixture("all.xml"));
	expect(data.plugins).toHaveLength(PREVIEW_CAPS.plugins);
	expect(data.plugins[0]).toBe("LunchBoxML");
	expect(data.pluginCount).toBe(4);
});

function script(id: string, overrides: Partial<Component> = {}): Component {
	return component(id, {
		type: "C# Script",
		nickName: "C#",
		script: { language: "csharp", code: "" },
		inputs: {
			x: { nick: "x", instanceGuid: `${id}-x` },
			y: { nick: "y", instanceGuid: `${id}-y` },
		},
		outputs: {
			out: { nick: "out", instanceGuid: `${id}-out` },
			a: { nick: "A", instanceGuid: `${id}-a` },
		},
		...overrides,
	});
}

function parsedOf(items: Component[], wires: ParsedGrasshopper["wires"] = []) {
	return {
		version: "1",
		components: Object.fromEntries(items.map((c) => [c.id, c])),
		wires,
	} as ParsedGrasshopper;
}

test("real C# and VB script fixtures get a signature without the console out port", () => {
	expect(buildPreview(fixture("csharp-component.xml")).signature).toEqual({
		language: "C#",
		inputKinds: [0, 0],
		outputKinds: [0],
		inputs: ["x", "y"],
		inputCount: 2,
		outputs: ["a"],
		outputCount: 1,
	});
	// VB and IronPython scripts with no wires: the first one wins the tie.
	expect(buildPreview(fixture("python3.xml")).signature).toEqual({
		language: "VB",
		inputKinds: [0, 0],
		outputKinds: [0],
		inputs: ["x", "y"],
		inputCount: 2,
		outputs: ["A"],
		outputCount: 1,
	});
});

test("script-only clips with inputs, params and panels keep a signature", () => {
	const data = buildPreview(
		parsedOf([
			script("s"),
			component("slider", { value: { type: "slider" }, inputs: {} }),
			component("panel", { type: "Panel", inputs: {} }),
			component("param", { type: "Number", inputs: {} }),
		])
	);
	expect(data.signature?.language).toBe("C#");
});

// Some names are shared, e.g. the Group component and the Group param.
function allXmlComponent(type: string, param = false) {
	const found = Object.values(fixture("all.xml").components).find(
		(c) =>
			c.type === type &&
			(!param ||
				!Object.values(c.inputs).some((p) => p.instanceGuid !== c.instanceGuid))
	);
	if (!found) throw new Error(`all.xml has no ${type}`);
	return { ...found, id: type };
}

test.each([
	"Relay",
	"MD Slider",
	"Get Number",
	"Panel",
	"Number Slider",
	"Jump",
])("a real native %s next to a script keeps the signature", (type) => {
	expect(
		buildPreview(parsedOf([script("s"), allXmlComponent(type)])).signature
	).toBeDefined();
});

test.each([
	"Triangle Panels C",
	"Panel Connections",
	"Diamond Panels",
	"Cull Pattern",
	"Combine Data",
])("a real %s operation next to a script rules the signature out", (type) => {
	expect(
		buildPreview(parsedOf([script("s"), allXmlComponent(type)])).signature
	).toBeUndefined();
});

test("truncation never splits a surrogate pair, so names stay well-formed", () => {
	const nick = "x".repeat(PREVIEW_CAPS.nameLength - 1) + "😀";
	const data = buildPreview(
		parsedOf([
			script("s", {
				nickName: nick,
				inputs: { a: { nick, instanceGuid: "a" } },
				outputs: { b: { nick, instanceGuid: "b" } },
			}),
			component("m", {
				nickName: nick,
				inputs: {},
				outputs: { o: { nick: "o", instanceGuid: "m-o" } },
			}),
		])
	);
	const strings = [
		...data.keyComponents,
		...data.signature!.inputs,
		...data.signature!.outputs,
	];
	expect(strings.length).toBeGreaterThan(0);
	for (const s of strings) {
		expect(s).toBe("x".repeat(PREVIEW_CAPS.nameLength - 1));
		expect(encodeURIComponent(s)).toBeTypeOf("string");
	}
});

test("clips with any operation or plugin component, or too many scripts, get no signature", () => {
	expect(
		buildPreview(parsedOf([script("s"), component("m")])).signature
	).toBeUndefined();
	expect(
		buildPreview(
			parsedOf([
				script("s"),
				component("p", { nickName: "Mesh+", library: "Kangaroo v2.0" }),
			])
		).signature
	).toBeUndefined();
	expect(
		buildPreview(parsedOf(["1", "2", "3", "4"].map((id) => script(id))))
			.signature
	).toBeUndefined();
	expect(buildPreview(parsedOf([component("m")])).signature).toBeUndefined();
});

test("picks the most-wired script, keeping definition order on ties", () => {
	const helper = script("h", {
		inputs: { q: { nick: "helperIn", instanceGuid: "h-q" } },
	});
	const main = script("m", {
		inputs: { q: { nick: "mainIn", instanceGuid: "m-q" } },
	});
	const slider = component("slider", {
		value: { type: "slider" },
		inputs: {},
	});
	expect(
		buildPreview(
			parsedOf(
				[helper, main, slider],
				[
					{ from: "slider.out", to: "m.q" },
					{ from: "h.a", to: "m.q" },
				]
			)
		).signature?.inputs
	).toEqual(["mainIn"]);
	expect(buildPreview(parsedOf([helper, main])).signature?.inputs).toEqual([
		"helperIn",
	]);
});

test("caps port names but keeps totals, skips blank nicks, and only drops a leading out port", () => {
	const ports = (prefix: string, n: number) =>
		Object.fromEntries(
			Array.from({ length: n }, (_, i) => [
				`${prefix}${i}`,
				{ nick: `${prefix}${i}`, instanceGuid: `${prefix}${i}` },
			])
		);
	const signature = buildPreview(
		parsedOf([
			script("s", {
				type: "Python 3 Script",
				script: { language: "python", code: "" },
				inputs: {
					...ports("in", 6),
					blank: { nick: "  ", instanceGuid: "blank" },
					long: { nick: "x".repeat(80), instanceGuid: "long" },
				},
				outputs: {
					first: { nick: "result", instanceGuid: "first" },
					out: { nick: "out", instanceGuid: "out" },
				},
			}),
		])
	).signature!;
	expect(signature.language).toBe("Python 3");
	expect(signature.inputCount).toBe(7);
	expect(signature.inputs).toHaveLength(PREVIEW_CAPS.signaturePorts);
	expect(signature.outputs).toEqual(["result", "out"]);

	const noPorts = buildPreview(
		parsedOf([
			script("s", {
				inputs: {},
				outputs: { out: { nick: "out", instanceGuid: "o" } },
			}),
		])
	).signature!;
	expect(noPorts).toMatchObject({ inputCount: 0, outputCount: 0 });
	expect(
		buildPreview(
			parsedOf([
				script("s", {
					inputs: { long: { nick: "x".repeat(80), instanceGuid: "l" } },
				}),
			])
		).signature!.inputs[0]
	).toHaveLength(PREVIEW_CAPS.nameLength);
});

test("wired standalone Curve keeps the signature and colours the grip", () => {
	const param = component("p", {
		type: "Curve",
		description: "Contains a collection of generic curves",
		inputs: { value: { nick: "V", instanceGuid: "p", source: "s-a" } },
		outputs: { value: { nick: "V", instanceGuid: "p" } },
	});
	const wires = [{ from: "s.a", to: "p.value" }];
	expect(
		buildPreview(parsedOf([script("s"), param], wires)).signature?.outputKinds
	).toEqual([3]);
	expect(
		buildPreview(parsedOf([script("s"), param, component("native")], wires))
			.signature
	).toBeUndefined();
});
test("wired standalone Panel keeps the signature and colours the grip", () => {
	const param = component("p", {
		type: "Panel",
		inputs: { value: { nick: "V", instanceGuid: "p", source: "s-a" } },
		outputs: { value: { nick: "V", instanceGuid: "p" } },
	});
	const wires = [{ from: "p.value", to: "s.x" }];
	expect(
		buildPreview(parsedOf([script("s"), param], wires)).signature?.inputKinds
	).toEqual([2, 0]);
	expect(
		buildPreview(parsedOf([script("s"), param, component("native")], wires))
			.signature
	).toBeUndefined();
});

test("signature naming shares eligibility and the most-wired main script", () => {
	const first = script("first", { nickName: "First" });
	const main = script("main", { nickName: "Main" });
	const parsed = parsedOf(
		[first, main],
		[
			{ from: "first.a", to: "main.x" },
			{ from: "main.a", to: "main.y" },
		]
	);
	expect(getSignatureScript(parsed)).toBe(main);
	expect(getSignatureScript(parsedOf([first, main]))).toBe(first);
	expect(getSignatureScript(parsedOf([main, component("op")]))).toBeUndefined();
});

test("script with wired Panel and Curve auto-names from the main script", () => {
	const main = script("s", { nickName: "My Script" });
	const panel = component("panel", {
		type: "Panel",
		inputs: { value: { nick: "V", instanceGuid: "panel" } },
		outputs: { value: { nick: "V", instanceGuid: "panel" } },
	});
	const curve = component("curve", {
		type: "Curve",
		description: "Contains a collection of generic curves",
		inputs: { value: { nick: "V", instanceGuid: "curve" } },
		outputs: { value: { nick: "V", instanceGuid: "curve" } },
	});
	expect(
		getMainScriptNickName(
			parsedOf(
				[main, panel, curve],
				[
					{ from: "panel.value", to: "s.x" },
					{ from: "s.a", to: "curve.value" },
				]
			)
		)
	).toBe("MyScript");
});

test.each([
	"Path Mapper",
	"Graph Mapper",
	"Data Recorder",
	"Image Sampler",
	"Cherry Picker",
	"Suirify",
	"Point On Curve",
	"Value Tracker",
	"Geometry Cache",
	"Galapagos",
	"Data Input",
])("a wired %s computes, so it rules the signature out", (type) => {
	const wires = [{ from: "s.a", to: `${type}.value` }];
	expect(
		buildPreview(parsedOf([script("s"), allXmlComponent(type)], wires))
			.signature
	).toBeUndefined();
});

test.each([
	"Curve",
	"Number",
	"Data",
	"Group",
	"Relay",
	"Get Number",
	"Value List",
	"Cluster Input",
	"Geometry Pipeline",
	"Calendar",
	"Earth Anchor Point",
	"Param Viewer",
	"Quick Graph",
])("a wired native %s keeps the signature", (type) => {
	const wires = [{ from: "s.a", to: `${type}.value` }];
	expect(
		buildPreview(parsedOf([script("s"), allXmlComponent(type, true)], wires))
			.signature?.outputKinds
	).toEqual([type === "Value List" ? 1 : 3]);
});

test("a Number param with an expression computes", () => {
	const num = Object.values(
		fixture("flatten-internal-expression.xml").components
	).find((c) => c.internalExpression)!;
	const wires = [{ from: "s.a", to: `${num.id}.value` }];
	expect(
		buildPreview(parsedOf([script("s"), num], wires)).signature
	).toBeUndefined();
});

test("a port wired to several components takes the most specific grip", () => {
	const panel = component("p", {
		type: "Panel",
		inputs: { value: { nick: "V", instanceGuid: "p" } },
		outputs: { value: { nick: "V", instanceGuid: "p" } },
	});
	const wires = [
		{ from: "s.a", to: "s2.x" },
		{ from: "s.a", to: "p.value" },
		{ from: "s.a", to: "s2.y" },
	];
	expect(
		buildPreview(parsedOf([script("s"), script("s2"), panel], wires)).signature
			?.outputKinds
	).toEqual([2]);
});

test("drops a port name that clips to nothing instead of storing it blank", () => {
	const sig = buildPreview(
		parsedOf([
			script("s", {
				inputs: {
					x: { nick: "\uD83D", instanceGuid: "s-x" },
					y: { nick: "y", instanceGuid: "s-y" },
				},
			}),
		])
	).signature!;
	expect(sig.inputs).toEqual(["y"]);
	expect(sig.inputKinds).toEqual([0]);
});
