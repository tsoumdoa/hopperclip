import type { GHNodeData, Port } from "../types/type";

export type ExpressionFields = {
	componentExpression?: unknown;
	internalExpression?: unknown;
	expression?: unknown;
	outputs?: Port[];
};

/** Component-level formulas only (Expression / InternalExpression). */
export function resolveComponentExpression(
	data: ExpressionFields
): string | undefined {
	if (
		typeof data.componentExpression === "string" &&
		data.componentExpression
	) {
		return data.componentExpression;
	}
	if (typeof data.internalExpression === "string" && data.internalExpression) {
		return data.internalExpression;
	}
	if (typeof data.expression === "string" && data.expression) {
		return data.expression;
	}
	return undefined;
}

/**
 * For compact value/panel nodes that don't render port labels, also accept a
 * port-level expression folded onto the single output.
 */
export function resolveInspectableExpression(
	data: ExpressionFields | Pick<GHNodeData, "outputs">
): string | undefined {
	const componentLevel = resolveComponentExpression(data);
	if (componentLevel) return componentLevel;

	const fromOutput = data.outputs?.find((port) => port.options?.expression)
		?.options?.expression;
	return fromOutput || undefined;
}
