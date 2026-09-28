import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
	await act(async () => {
		for (const root of roots.splice(0)) root.unmount();
	});
	document.body.replaceChildren();
});

export async function render(node: ReactNode) {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => root.render(node));
	return {
		rerender: async (next: ReactNode) => {
			await act(async () => root.render(next));
		},
	};
}

export function button(label: string) {
	const element = Array.from(document.querySelectorAll("button")).find(
		(button) =>
			button.textContent === label ||
			button.getAttribute("aria-label") === label
	);
	if (!element) throw new Error(`Button not found: ${label}`);
	return element;
}

export async function click(element: HTMLElement) {
	await act(async () => element.click());
}

export async function press(
	element: Element,
	key: string,
	options: KeyboardEventInit = {}
) {
	await act(async () =>
		element.dispatchEvent(
			new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				key,
				...options,
			})
		)
	);
}

export async function typeText(element: HTMLInputElement, value: string) {
	await act(async () => {
		// Use the native setter so React observes the same change as user input.
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value"
		)!.set!.call(element, value);
		element.dispatchEvent(new Event("input", { bubbles: true }));
	});
}
