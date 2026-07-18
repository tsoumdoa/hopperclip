import { describe, expect, test } from "vitest";
import {
	resolveComponentExpression,
	resolveInspectableExpression,
} from "./component-expression";

describe("resolveComponentExpression", () => {
	test("prefers componentExpression, then internalExpression, then expression", () => {
		expect(
			resolveComponentExpression({
				componentExpression: "x/2",
				internalExpression: "y",
				expression: "z",
			})
		).toBe("x/2");
		expect(
			resolveComponentExpression({
				internalExpression: "a+1",
			})
		).toBe("a+1");
		expect(
			resolveComponentExpression({
				expression: 'Format("{0}", x)',
			})
		).toBe('Format("{0}", x)');
	});

	test("does not fall back to port options", () => {
		expect(
			resolveComponentExpression({
				outputs: [{ id: "b", label: "R", options: { expression: "x*2" } }],
			})
		).toBeUndefined();
	});
});

describe("resolveInspectableExpression", () => {
	test("falls back to a port expression for compact value nodes", () => {
		expect(
			resolveInspectableExpression({
				outputs: [
					{ id: "a", label: "V" },
					{ id: "b", label: "R", options: { expression: "x*2" } },
				],
			})
		).toBe("x*2");
	});
});
