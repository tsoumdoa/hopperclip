export type ExpressionPopupMode = "closed" | "hover" | "pinned";

export type ExpressionPopupAction =
	| { type: "hover-start" }
	| { type: "hover-end" }
	| { type: "click-trigger" }
	| { type: "dismiss" };

export const EXPRESSION_HOVER_DELAY_MS = 150;

export function expressionPopupReducer(
	state: ExpressionPopupMode,
	action: ExpressionPopupAction
): ExpressionPopupMode {
	switch (action.type) {
		case "hover-start":
			return state === "pinned" ? "pinned" : "hover";
		case "hover-end":
			return state === "pinned" ? "pinned" : "closed";
		case "click-trigger":
			return state === "pinned" ? "closed" : "pinned";
		case "dismiss":
			return "closed";
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}

export function isExpressionPopupOpen(mode: ExpressionPopupMode): boolean {
	return mode !== "closed";
}
