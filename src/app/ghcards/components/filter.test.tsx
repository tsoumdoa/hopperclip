// @vitest-environment happy-dom
import { act, useState } from "react";
import { expect, test, vi } from "vitest";
import type { GhPost } from "@/types/types";
import { button, click, press, render, typeText } from "@/test/render";
import useFilter from "../hooks/use-filter";
import Filter from "./filter";

function card(name: string, description?: string, tags?: string[]): GhPost {
	return {
		_id: name as GhPost["_id"],
		_creationTime: 0,
		name,
		description,
		tags,
		dateCreated: "2026-01-01",
		dateUpdated: "2026-01-01",
		bucketUrl: name,
	};
}
const cards = [
	card("PanelTools", "Surface tools", ["Facade", "Panel"]),
	card("Attractor", "Panel surface utilities", ["Geometry"]),
	card("Curve", undefined, ["Panel"]),
	card("Unrelated"),
];
const input = () =>
	document.querySelector<HTMLInputElement>('input[aria-label="Search cards"]')!;

function Harness({
	data = cards,
	clearTags = () => {},
	onResults,
}: {
	data?: GhPost[];
	clearTags?: () => void;
	onResults?: (names: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const filter = useFilter(data, clearTags, open, setOpen);
	onResults?.(filter.filteredCards.map((card) => card.name));
	return (
		<>
			<button onClick={() => setOpen(true)}>Search</button>
			<Filter
				showFilter={open}
				handleFilterAction={filter.handleFilter}
				prevFilter={filter.filterKeyword}
				matchCount={filter.filteredCards.length}
				onDismiss={() => setOpen(false)}
				onClear={filter.clearFilter}
			/>
			<output>{filter.filteredCards.map((card) => card.name).join(",")}</output>
		</>
	);
}

test("search matches names, descriptions and tags once per card, preserving input order", async () => {
	await render(<Harness />);
	await click(button("Search"));
	await typeText(input(), "PANEL");
	expect(document.querySelector("output")?.textContent).toBe(
		"PanelTools,Attractor,Curve"
	);
	await typeText(input(), "geomettry");
	expect(document.querySelector("output")?.textContent).toBe("Attractor");
	await typeText(input(), "zzzzzz");
	expect(document.querySelector("output")?.textContent).toBe("");
	await typeText(input(), "");
	expect(document.querySelector("output")?.textContent).toBe(
		"PanelTools,Attractor,Curve,Unrelated"
	);
});

test("results reflect newly loaded and reordered cards in the first render", async () => {
	const onResults = vi.fn();
	const view = await render(<Harness data={[]} onResults={onResults} />);
	onResults.mockClear();
	await view.rerender(<Harness data={cards} onResults={onResults} />);
	expect(onResults.mock.calls[0][0]).toEqual(cards.map((card) => card.name));
	await click(button("Search"));
	await typeText(input(), "panel");
	onResults.mockClear();
	await view.rerender(
		<Harness data={[...cards].reverse()} onResults={onResults} />
	);
	expect(onResults.mock.calls[0][0]).toEqual([
		"Curve",
		"Attractor",
		"PanelTools",
	]);
});

test("Enter applies search, restores focus, and reopening retains the query", async () => {
	await render(<Harness />);
	const opener = button("Search");
	opener.focus();
	await click(opener);
	expect(document.activeElement).toBe(input());
	await typeText(input(), "panel");
	await press(input(), "Enter");
	// Radix restores focus after the content unmounts.
	await vi.waitFor(() => expect(document.activeElement).toBe(opener));
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	expect(document.querySelector("output")?.textContent).toBe(
		"PanelTools,Attractor,Curve"
	);
	await click(opener);
	expect(input().value).toBe("panel");
});

test("Escape clears only the text search and keeps tag filters", async () => {
	const clearTags = vi.fn();
	await render(<Harness clearTags={clearTags} />);
	await click(button("Search"));
	await typeText(input(), "panel");
	await press(input(), "Escape");
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	expect(clearTags).not.toHaveBeenCalled();
	await click(button("Search"));
	expect(input().value).toBe("");
});

test("focus is trapped and the keyboard shortcut closes without clearing", async () => {
	await render(<Harness />);
	const opener = button("Search");
	opener.focus();
	await press(opener, "k", { metaKey: true });
	await typeText(input(), "panel");
	await act(async () => opener.focus());
	expect(document.activeElement).toBe(input());
	await press(input(), "k", { metaKey: true });
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	expect(document.querySelector("output")?.textContent).toBe(
		"PanelTools,Attractor,Curve"
	);
});
