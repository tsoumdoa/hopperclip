import type { Component } from "parser/src/types";

export function extractValue(component: Component): string | undefined {
	const v = component.value;
	if (!v) return undefined;

	switch (v.type) {
		case "number":
		case "slider":
			return v.current !== undefined ? String(v.current) : undefined;
		case "panel":
		case "scribble":
		case "text":
			return v.text ?? undefined;
		case "valueList":
			return v.items?.[v.selectedIndex ?? 0]?.name ?? undefined;
		case "toggle":
			return String(v.value ?? false);
		case "swatch":
			return v.color ?? "#ffffff";
		default:
			return undefined;
	}
}
