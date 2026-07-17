export type GHRuntimeState = "normal" | "hidden" | "locked";

export function runtimePalette(state: GHRuntimeState, accentColor?: string) {
	if (state === "locked") {
		return { side: "#858585", center: "#858585", text: "#555555" };
	}
	if (state === "hidden") {
		return {
			side: "#a9a9a9",
			center: accentColor ?? "#555555",
			text: "#333333",
		};
	}
	return { side: "#e8e8e8", center: accentColor ?? "#808080", text: "#222222" };
}
