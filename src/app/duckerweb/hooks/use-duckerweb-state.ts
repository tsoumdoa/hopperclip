import { useCallback, useMemo, useReducer, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { validateGhXml } from "../../utils/gh-xml";
import { GhFileError, ghFileToGhXml } from "../../utils/gh-file";
import { generateFlowData } from "../gh-flow-generator";
import {
	formatOverlapRejection,
	resolveDiffComparison,
	type DiffMatchMode,
} from "../gh-diff";
import type {
	DuckerwebActions,
	DuckerwebImportResult,
	DuckerwebState,
	GHDiffResult,
	GHNode,
	ViewMode,
} from "../types/type";
import type { Edge } from "@xyflow/react";

export function prepareDuckerwebImport(
	xml: string,
	source: "clipboard" | "file"
): DuckerwebImportResult {
	const { isValid, errorMsg } = validateGhXml(xml);

	if (!isValid) {
		return {
			ok: false,
			error: `${source === "file" ? "Selected" : "Pasted"} GhXml is not valid: \n${errorMsg}`,
		};
	}

	try {
		const parsedData = buildGhJson(xml, { includeVisuals: true });
		const flowData = generateFlowData(parsedData);

		return {
			ok: true,
			parsedData,
			nodes: flowData.nodes as GHNode[],
			edges: flowData.edges,
		};
	} catch (err) {
		return {
			ok: false,
			error: `Failed to parse XML: ${err instanceof Error ? err.message : "Unknown error"}`,
		};
	}
}

export function resolveDuckerwebPasteTarget(
	viewMode: ViewMode
): "original" | "comparison" {
	return viewMode === "diff" ? "comparison" : "original";
}

export function resolveDuckerwebImportView(
	currentView: ViewMode,
	source: "clipboard" | "file"
): ViewMode {
	switch (source) {
		case "clipboard":
		case "file":
			return "flow";
		default:
			return currentView;
	}
}

const DEFAULT_FILE_NAME = "Clipboard GhXml";

const initialState: DuckerwebState = {
	xmlData: undefined,
	isValidXml: false,
	xmlError: "",
	parsedData: null,
	viewMode: "flow",
	nodes: [],
	edges: [],
	error: "",
	comparisonData: null,
	diffResult: null,
	diffError: "",
	fileName: "",
	comparisonFileName: "",
	comparisonRejected: false,
	matchByTypeGuid: false,
	diffNotice: "",
};

type DuckerwebAction =
	// Clear the original-import errors before a new paste/file read begins.
	| { type: "importStart" }
	| { type: "importError"; message: string }
	| {
			type: "ingestOriginal";
			xml: string;
			source: "clipboard" | "file";
			parsedData: ParsedGrasshopper;
			nodes: GHNode[];
			edges: Edge[];
			name?: string;
	  }
	// Clear the diff errors before a new comparison paste/file read begins.
	| { type: "comparisonStart" }
	| { type: "comparisonError"; message: string }
	| { type: "startComparisonView"; name?: string }
	| {
			type: "comparisonApplied";
			after: ParsedGrasshopper;
			result: GHDiffResult;
			notice: string;
	  }
	| { type: "comparisonRejected"; after: ParsedGrasshopper; message: string }
	| { type: "clearComparison" }
	| { type: "setViewMode"; value: SetStateAction<ViewMode> }
	| { type: "setMatchByTypeGuid"; enabled: boolean }
	| { type: "clearDiffNotice" }
	| { type: "reset" };

function duckerwebReducer(
	state: DuckerwebState,
	action: DuckerwebAction
): DuckerwebState {
	switch (action.type) {
		case "importStart":
			return { ...state, xmlError: "", error: "" };
		case "importError":
			return { ...state, xmlError: action.message };
		case "ingestOriginal":
			return {
				...state,
				xmlData: action.xml,
				isValidXml: true,
				xmlError: "",
				parsedData: action.parsedData,
				viewMode: resolveDuckerwebImportView(state.viewMode, action.source),
				nodes: action.nodes,
				edges: action.edges,
				error: "",
				comparisonData: null,
				diffResult: null,
				diffError: "",
				fileName: action.name ?? DEFAULT_FILE_NAME,
				comparisonFileName: "",
				comparisonRejected: false,
				diffNotice: "",
			};
		case "comparisonStart":
			return { ...state, diffError: "", comparisonRejected: false };
		case "comparisonError":
			return { ...state, diffError: action.message, comparisonRejected: false };
		case "startComparisonView":
			return {
				...state,
				comparisonFileName: action.name ?? DEFAULT_FILE_NAME,
				viewMode: "diff",
			};
		case "comparisonApplied":
			return {
				...state,
				comparisonData: action.after,
				comparisonRejected: false,
				diffResult: action.result,
				diffNotice: action.notice,
				diffError: "",
			};
		case "comparisonRejected":
			return {
				...state,
				comparisonRejected: true,
				comparisonData: action.after,
				diffResult: null,
				diffNotice: "",
				diffError: action.message,
			};
		case "clearComparison":
			return {
				...state,
				comparisonData: null,
				diffResult: null,
				diffError: "",
				comparisonFileName: "",
				comparisonRejected: false,
				diffNotice: "",
			};
		case "setViewMode":
			return {
				...state,
				viewMode:
					typeof action.value === "function"
						? action.value(state.viewMode)
						: action.value,
			};
		case "setMatchByTypeGuid":
			return { ...state, matchByTypeGuid: action.enabled };
		case "clearDiffNotice":
			return { ...state, diffNotice: "" };
		case "reset":
			return initialState;
	}
}

export function useDuckerwebState(): {
	state: DuckerwebState;
	actions: DuckerwebActions;
} {
	const [state, dispatch] = useReducer(duckerwebReducer, initialState);
	const { parsedData, comparisonData } = state;

	const activeRequest = useRef(0);
	const activeComparisonRequest = useRef(0);
	// Clipboard and file imports resolve asynchronously, so the mode has to be
	// read when the diff runs — not when the import callback was created — or a
	// toggle made mid-read would be ignored by the diff it is meant to control.
	const matchModeRef = useRef<DiffMatchMode>("instance");

	const applyComparisonResult = useCallback(
		(before: ParsedGrasshopper, after: ParsedGrasshopper, mode: DiffMatchMode) => {
			const resolution = resolveDiffComparison(before, after, mode);
			if (!resolution.result) {
				dispatch({
					type: "comparisonRejected",
					after,
					message: formatOverlapRejection(
						resolution.overlap,
						resolution.failedTypeOverlap
					),
				});
				return;
			}
			dispatch({
				type: "comparisonApplied",
				after,
				result: resolution.result,
				notice: resolution.fellBackToType
					? "Instance IDs did not overlap enough, so Ducker matched components by type GUID instead."
					: "",
			});
		},
		[]
	);

	/**
	 * Shared validation+state-update path used by both clipboard paste and
	 * file drop, so the UX is identical regardless of input source.
	 */
	const ingestXml = useCallback(
		(xml: string, source: "clipboard" | "file", name?: string) => {
			const result = prepareDuckerwebImport(xml, source);
			if (!result.ok) {
				dispatch({ type: "importError", message: result.error });
				return;
			}
			// Any comparison already being read captured the previous original.
			// Invalidate it before committing this replacement so it cannot publish
			// a stale diff after the new original is visible.
			activeComparisonRequest.current += 1;
			dispatch({
				type: "ingestOriginal",
				xml,
				source,
				parsedData: result.parsedData,
				nodes: result.nodes,
				edges: result.edges,
				name,
			});
		},
		[]
	);

	const ingestComparisonXml = useCallback(
		(xml: string, source: "clipboard" | "file", name?: string) => {
			if (!parsedData) return;
			const result = prepareDuckerwebImport(xml, source);
			if (!result.ok) {
				// Leave any notice in place: it still describes the diff on screen.
				dispatch({ type: "comparisonError", message: result.error });
				return;
			}
			dispatch({ type: "startComparisonView", name });
			applyComparisonResult(parsedData, result.parsedData, matchModeRef.current);
		},
		[applyComparisonResult, parsedData]
	);

	const applyPastedXml = useCallback(
		(text: string, requestId: number) => {
			if (requestId !== activeRequest.current) return;
			if (text.length === 0) {
				dispatch({ type: "importError", message: "Clipboard is empty" });
				return;
			}
			ingestXml(text, "clipboard");
		},
		[ingestXml]
	);

	const handlePastedXml = useCallback(
		(text: string) => {
			const requestId = ++activeRequest.current;
			dispatch({ type: "importStart" });
			applyPastedXml(text, requestId);
		},
		[applyPastedXml]
	);

	const handlePasteFromClipboard = useCallback(async () => {
		const requestId = ++activeRequest.current;
		dispatch({ type: "importStart" });
		try {
			const text = await navigator.clipboard.readText();
			applyPastedXml(text, requestId);
		} catch (err) {
			if (requestId !== activeRequest.current) return;
			dispatch({
				type: "importError",
				message: "Failed to read clipboard contents: \n" + String(err),
			});
		}
	}, [applyPastedXml]);

	const handleFileSelected = useCallback(
		async (file: File) => {
			const requestId = ++activeRequest.current;
			dispatch({ type: "importStart" });
			try {
				const xml = await ghFileToGhXml(file);
				if (requestId !== activeRequest.current) return;
				ingestXml(xml, "file", file.name);
			} catch (err) {
				if (requestId !== activeRequest.current) return;
				dispatch({
					type: "importError",
					message:
						err instanceof GhFileError
							? err.message
							: `Failed to read file "${file.name}": \n${
									err instanceof Error ? err.message : String(err)
								}`,
				});
			}
		},
		[ingestXml]
	);

	const handleClear = useCallback(() => {
		activeRequest.current += 1;
		activeComparisonRequest.current += 1;
		matchModeRef.current = "instance";
		dispatch({ type: "reset" });
	}, []);

	const applyPastedComparisonXml = useCallback(
		(text: string, requestId: number) => {
			if (requestId !== activeComparisonRequest.current) return;
			if (text.length === 0) {
				dispatch({ type: "comparisonError", message: "Clipboard is empty" });
				return;
			}
			ingestComparisonXml(text, "clipboard");
		},
		[ingestComparisonXml]
	);

	const handlePastedComparisonXml = useCallback(
		(text: string) => {
			const requestId = ++activeComparisonRequest.current;
			dispatch({ type: "comparisonStart" });
			applyPastedComparisonXml(text, requestId);
		},
		[applyPastedComparisonXml]
	);

	const handlePasteComparison = useCallback(async () => {
		const requestId = ++activeComparisonRequest.current;
		dispatch({ type: "comparisonStart" });
		try {
			const text = await navigator.clipboard.readText();
			applyPastedComparisonXml(text, requestId);
		} catch (err) {
			if (requestId !== activeComparisonRequest.current) return;
			dispatch({
				type: "comparisonError",
				message: "Failed to read clipboard contents: \n" + String(err),
			});
		}
	}, [applyPastedComparisonXml]);

	const handleComparisonFileSelected = useCallback(
		async (file: File) => {
			const requestId = ++activeComparisonRequest.current;
			dispatch({ type: "comparisonStart" });
			try {
				const xml = await ghFileToGhXml(file);
				if (requestId !== activeComparisonRequest.current) return;
				ingestComparisonXml(xml, "file", file.name);
			} catch (err) {
				if (requestId !== activeComparisonRequest.current) return;
				dispatch({
					type: "comparisonError",
					message:
						err instanceof GhFileError
							? err.message
							: `Failed to read file "${file.name}": \n${
									err instanceof Error ? err.message : String(err)
								}`,
				});
			}
		},
		[ingestComparisonXml]
	);

	const handleClearComparison = useCallback(() => {
		activeComparisonRequest.current += 1;
		dispatch({ type: "clearComparison" });
	}, []);

	const setViewMode = useCallback<Dispatch<SetStateAction<ViewMode>>>(
		(value) => dispatch({ type: "setViewMode", value }),
		[]
	);

	const setMatchByTypeGuid = useCallback(
		(enabled: boolean) => {
			matchModeRef.current = enabled ? "type" : "instance";
			dispatch({ type: "setMatchByTypeGuid", enabled });
			if (!parsedData || !comparisonData) {
				dispatch({ type: "clearDiffNotice" });
				return;
			}
			applyComparisonResult(
				parsedData,
				comparisonData,
				enabled ? "type" : "instance"
			);
		},
		[applyComparisonResult, comparisonData, parsedData]
	);

	const actions = useMemo<DuckerwebActions>(
		() => ({
			handlePasteFromClipboard,
			handlePastedXml,
			handleFileSelected,
			handlePasteComparison,
			handlePastedComparisonXml,
			handleComparisonFileSelected,
			handleClearComparison,
			handleClear,
			setViewMode,
			setMatchByTypeGuid,
		}),
		[
			handlePasteFromClipboard,
			handlePastedXml,
			handleFileSelected,
			handlePasteComparison,
			handlePastedComparisonXml,
			handleComparisonFileSelected,
			handleClearComparison,
			handleClear,
			setViewMode,
			setMatchByTypeGuid,
		]
	);

	return { state, actions };
}
