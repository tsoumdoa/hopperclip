import type { Edge } from "@xyflow/react";
import type { GHNode } from "@/app/duckerweb/types/type";

const input = (id: string, label: string) => ({ id, label });
const output = (id: string, label: string) => ({ id, label });

export const flowGalleryNodes: GHNode[] = [
	{
		id: "component-normal",
		type: "component",
		position: { x: 80, y: 80 },
		data: {
			label: "Addition",
			type: "component",
			inputs: [input("a", "A"), input("b", "B")],
			outputs: [output("result", "Result")],
		},
	},
	{
		id: "component-hidden",
		type: "component",
		position: { x: 330, y: 80 },
		data: {
			label: "Long component name",
			type: "component",
			runtimeState: "hidden",
			inputs: [
				input("geometry", "Geometry"),
				input("very-long", "Very long input label"),
			],
			outputs: [output("out", "Output")],
		},
	},
	{
		id: "component-locked",
		type: "component",
		position: { x: 660, y: 80 },
		selected: true,
		data: {
			label: "Locked",
			type: "component",
			runtimeState: "locked",
			inputs: [input("in", "Input")],
			outputs: [output("out", "Output")],
		},
	},
	{
		id: "script",
		type: "script",
		position: { x: 920, y: 65 },
		data: {
			label: "Python 3",
			type: "script",
			inputs: [input("x", "x"), input("y", "y")],
			outputs: [output("a", "a")],
			script: {
				language: "python",
				title: "Gallery example",
				code: "a = x + y\nprint(a)",
			},
		},
	},
	{
		id: "panel",
		type: "panel",
		position: { x: 80, y: 300 },
		data: {
			label: "Panel",
			type: "panel",
			value: "Preview text\n123.456",
			height: 52,
			inputs: [input("in", "")],
			outputs: [output("out", "")],
		},
	},
	{
		id: "slider",
		type: "slider",
		position: { x: 330, y: 310 },
		data: {
			label: "Number Slider",
			type: "slider",
			value: "4.20",
			percent: 42,
			inputs: [],
			outputs: [output("out", "Value")],
		},
	},
	{
		id: "value-list",
		type: "valueList",
		position: { x: 650, y: 310 },
		data: {
			label: "Quality",
			type: "valueList",
			value: "High",
			inputs: [],
			outputs: [output("out", "Selected")],
		},
	},
	{
		id: "toggle",
		type: "toggle",
		position: { x: 920, y: 310 },
		data: {
			label: "Enabled",
			type: "toggle",
			value: "True",
			inputs: [],
			outputs: [output("out", "Boolean")],
		},
	},
	{
		id: "group",
		type: "group",
		position: { x: 45, y: 260 },
		style: { width: 1200, height: 315 },
		zIndex: 0,
		data: {
			label: "Inputs, values, and utility components",
			type: "group",
			inputs: [],
			outputs: [],
			members: [
				"panel",
				"slider",
				"value-list",
				"toggle",
				"swatch",
				"button",
				"relay",
				"relay-hidden",
				"relay-locked",
			],
			containerBounds: { x: 45, y: 260, width: 1200, height: 315 },
		},
	},
	{
		id: "swatch",
		type: "swatch",
		position: { x: 80, y: 500 },
		data: {
			label: "Colour Swatch",
			type: "swatch",
			color: "255;67;154;224",
			inputs: [],
			outputs: [output("out", "Colour")],
		},
	},
	{
		id: "button",
		type: "button",
		position: { x: 330, y: 500 },
		data: {
			label: "Run solver",
			type: "button",
			inputs: [],
			outputs: [output("out", "Pressed")],
		},
	},
	{
		id: "relay",
		type: "relay",
		position: { x: 650, y: 500 },
		data: {
			label: "Geometry relay",
			type: "relay",
			inputs: [input("in", "Input")],
			outputs: [output("out", "Geometry")],
		},
	},
	{
		id: "relay-hidden",
		type: "relay",
		position: { x: 880, y: 500 },
		data: {
			label: "Srf",
			type: "relay",
			runtimeState: "hidden",
			inputs: [input("in", "Input")],
			outputs: [output("out", "Surface")],
		},
	},
	{
		id: "relay-locked",
		type: "relay",
		position: { x: 1060, y: 500 },
		data: {
			label: "Rec",
			type: "relay",
			runtimeState: "locked",
			inputs: [input("in", "Input")],
			outputs: [output("out", "Rectangle")],
		},
	},
];

export const flowGalleryEdges: Edge[] = [
	{
		id: "normal-wire",
		source: "component-normal",
		sourceHandle: "result",
		target: "component-hidden",
		targetHandle: "geometry",
		type: "default",
		data: { wireStyle: "normal" },
	},
	{
		id: "faint-wire",
		source: "component-hidden",
		sourceHandle: "out",
		target: "component-locked",
		targetHandle: "in",
		type: "default",
		data: { wireStyle: "faint" },
	},
	{
		id: "hidden-wire",
		source: "component-locked",
		sourceHandle: "out",
		target: "script",
		targetHandle: "x",
		type: "default",
		data: { wireStyle: "hidden" },
	},
];
