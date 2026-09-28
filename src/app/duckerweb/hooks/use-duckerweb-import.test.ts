import { readFileSync } from "node:fs";
import { createElement, useReducer } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { DuckerwebActions, DuckerwebState } from "../types/type";
import { useDuckerwebState } from "./use-duckerweb-state";

vi.mock("react", async (importOriginal) => {
	const react = await importOriginal<typeof import("react")>();
	return { ...react, useReducer: vi.fn(react.useReducer) };
});

afterEach(() => vi.mocked(useReducer).mockReset());

const xml = readFileSync("parser/sand/xmls/csharp-component.xml", "utf8");
const file = (name: string) => new File([xml], name);

// Exercise the real import actions and reducer without a DOM dependency.
// SSR provides the hook context; capture reducer updates after async imports.
function setup() {
	let state: unknown;
	let actions: DuckerwebActions;
	vi.mocked(useReducer).mockImplementation((reducer, initialState) => {
		state = initialState;
		return [
			state,
			(action?: unknown) => {
				state = reducer(state, action);
			},
		];
	});
	function Harness() {
		actions = useDuckerwebState().actions;
		return null;
	}
	renderToString(createElement(Harness));
	return { actions: actions!, getState: () => state as DuckerwebState };
}

function deferredFile() {
	let resolve!: (file: File) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<File>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe("DuckerWeb pending file imports", () => {
	test("imports a downloaded sample when no newer action has occurred", async () => {
		const { actions, getState } = setup();
		const sample = deferredFile();
		const loading = actions.handleFileSelected(sample.promise);
		sample.resolve(file("sample.ghx"));
		await loading;
		expect(getState().fileName).toBe("sample.ghx");
		expect(getState().nodes.length).toBeGreaterThan(0);
	});

	test("a late sample cannot replace a newer file", async () => {
		const { actions, getState } = setup();
		const sample = deferredFile();
		const loading = actions.handleFileSelected(sample.promise);
		await actions.handleFileSelected(file("mine.ghx"));
		sample.resolve(file("sample.ghx"));
		await loading;
		expect(getState().fileName).toBe("mine.ghx");
	});

	test("a late sample cannot replace a newer paste", async () => {
		const { actions, getState } = setup();
		const sample = deferredFile();
		const loading = actions.handleFileSelected(sample.promise);
		actions.handlePastedXml(xml);
		sample.resolve(file("sample.ghx"));
		await loading;
		expect(getState().fileName).toBe("Clipboard GhXml");
		expect(getState().xmlData).toBe(xml);
	});

	test("Clear invalidates a pending sample", async () => {
		const { actions, getState } = setup();
		const sample = deferredFile();
		const loading = actions.handleFileSelected(sample.promise);
		actions.handleClear();
		sample.resolve(file("sample.ghx"));
		await loading;
		expect(getState().parsedData).toBeNull();
		expect(getState().xmlData).toBeUndefined();
	});

	test("reports current download errors but ignores stale ones", async () => {
		const { actions, getState } = setup();
		await actions.handleFileSelected(
			Promise.reject(new Error("Download failed"))
		);
		expect(getState().xmlError).toContain("Download failed");
		const sample = deferredFile();
		const loading = actions.handleFileSelected(sample.promise);
		await actions.handleFileSelected(file("mine.ghx"));
		sample.reject(new Error("Stale failure"));
		await loading;
		expect(getState().fileName).toBe("mine.ghx");
		expect(getState().xmlError).toBe("");
	});
});
