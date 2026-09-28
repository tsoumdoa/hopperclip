// @vitest-environment happy-dom
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { button, click, render, typeText } from "@/test/render";
import { NameDescriptionAndTags } from "./gh-card-body";

const { query } = vi.hoisted(() => ({
	query: vi.fn(() => [{ tag: "Panel", count: 1 }]),
}));
vi.mock("convex/react", () => ({ useQuery: query }));

function Harness() {
	const [editMode, setEditMode] = useState(false);
	const [tag, setTag] = useState("");
	const [ghInfo, setGhInfo] = useState({
		name: "PanelTools",
		description: "Description",
		tags: ["Panel"],
	});
	return (
		<>
			<button
				onClick={() => {
					setEditMode(!editMode);
					setTag("");
				}}
			>
				{editMode ? "Cancel" : "Edit"}
			</button>
			<NameDescriptionAndTags
				editMode={editMode}
				ghInfo={ghInfo}
				setGhInfo={setGhInfo}
				tag={tag}
				setTag={setTag}
				addTag={() => {}}
				newXmlData={undefined}
				setNewXmlData={() => {}}
				isValidXml={false}
				xmlError=""
				setXmlError={() => {}}
				handlePasteFromClipboard={() => {}}
				handleFileSelected={() => {}}
			/>
		</>
	);
}

beforeEach(() => query.mockClear());

test("read-only cards do not mount tag queries or editing controls", async () => {
	await render(<Harness />);
	expect(query).not.toHaveBeenCalled();
	expect(document.querySelector("input")).toBeNull();
	await click(button("Edit"));
	expect(query).toHaveBeenCalled();
	expect(document.querySelector('input[name="tag"]')).not.toBeNull();
});

test("a new editing session clears errors while preserving existing-tag validation", async () => {
	await render(<Harness />);
	await click(button("Edit"));
	await typeText(
		document.querySelector<HTMLInputElement>('input[name="tag"]')!,
		"Panel"
	);
	await click(button("Add"));
	expect(document.body.textContent).toContain("Tag already exists");
	await click(button("Cancel"));
	await click(button("Edit"));
	expect(document.body.textContent).not.toContain("Tag already exists");
	await typeText(
		document.querySelector<HTMLInputElement>('input[name="tag"]')!,
		"Panel"
	);
	await click(button("Add"));
	expect(document.body.textContent).toContain("Tag already exists");
});
