import type { Component } from "parser/src/types";
import type { GHNodeType } from "../types";

export function getComponentNodeType(component: Component): GHNodeType {
	if (component.type === "Group") return "group";
	if (component.type.endsWith("Script")) return "script";
	if (component.value?.type === "scribble") return "scribble";
	if (component.value?.type === "slider") return "slider";
	if (component.value?.type === "valueList") return "valueList";
	if (component.value?.type === "toggle") return "toggle";
	if (component.value?.type === "swatch") return "swatch";
	if (component.value?.type === "button") return "button";

	const type = component.type.toLowerCase();
	if (type.includes("panel")) return "panel";

	if (component.description?.startsWith("Contains a collection of"))
		return "relay";

	const valueTypes = new Set([
		"number",
		"boolean",
		"integer",
		"text",
		"colour",
		"color",
		"point",
		"vector",
		"domain",
	]);

	if (valueTypes.has(type)) {
		return "value";
	}

	return "component";
}

export function getAccentColor(component: Component): string {
	const type = component.type.toLowerCase();

	if (
		type.includes("script") ||
		type.includes("python") ||
		type.includes("csharp")
	) {
		return "#606060";
	}

	const scriptNodeTypes = ["ghpython", "c# script", "vb script"];
	if (scriptNodeTypes.some((t) => type.includes(t))) {
		return "#606060";
	}

	return "#585858";
}
