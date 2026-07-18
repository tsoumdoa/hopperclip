// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ExpressionInspector } from "./ExpressionInspector";
import { EXPRESSION_HOVER_DELAY_MS } from "./expression-popup-state";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ExpressionInspector", () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(() => {
		act(() => {
			root.unmount();
		});
		container.remove();
		document
			.querySelectorAll("[data-expression-popup]")
			.forEach((node) => node.remove());
		vi.useRealTimers();
	});

	function renderInspector(expression = "x / 2 + 1") {
		act(() => {
			root.render(<ExpressionInspector expression={expression} />);
		});
	}

	test("shows the formula in a popup after hover delay", () => {
		vi.useFakeTimers();
		renderInspector();

		const trigger = container.querySelector(
			"[data-expression-trigger]"
		) as HTMLButtonElement;
		expect(trigger).toBeTruthy();

		act(() => {
			trigger.focus();
		});
		act(() => {
			vi.advanceTimersByTime(EXPRESSION_HOVER_DELAY_MS);
		});

		const formula = document.querySelector("[data-expression-formula]");
		expect(formula?.textContent).toBe("x / 2 + 1");
	});

	test("click pins the popup so hover-out does not dismiss it", () => {
		vi.useFakeTimers();
		renderInspector();

		const trigger = container.querySelector(
			"[data-expression-trigger]"
		) as HTMLButtonElement;

		act(() => {
			trigger.click();
		});

		expect(
			document.querySelector("[data-expression-formula]")?.textContent
		).toBe("x / 2 + 1");

		act(() => {
			trigger.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
			vi.advanceTimersByTime(200);
		});

		expect(
			document.querySelector("[data-expression-formula]")?.textContent
		).toBe("x / 2 + 1");
	});

	test("outside click unpins the expression popup", () => {
		renderInspector();

		const trigger = container.querySelector(
			"[data-expression-trigger]"
		) as HTMLButtonElement;

		act(() => {
			trigger.click();
		});
		expect(document.querySelector("[data-expression-formula]")).toBeTruthy();

		act(() => {
			document.body.dispatchEvent(
				new PointerEvent("pointerdown", { bubbles: true })
			);
		});

		expect(document.querySelector("[data-expression-formula]")).toBeNull();
	});

	test("second click toggles a pinned popup closed", () => {
		renderInspector();

		const trigger = container.querySelector(
			"[data-expression-trigger]"
		) as HTMLButtonElement;

		act(() => {
			trigger.click();
		});
		expect(document.querySelector("[data-expression-formula]")).toBeTruthy();

		act(() => {
			trigger.click();
		});
		expect(document.querySelector("[data-expression-formula]")).toBeNull();
	});
});
