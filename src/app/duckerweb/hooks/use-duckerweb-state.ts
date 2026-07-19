import { useState, useCallback, useRef } from "react";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { validateGhXml } from "../../utils/gh-xml";
import { GhFileError, ghFileToGhXml } from "../../utils/gh-file";
import { generateFlowData } from "../gh-flow-generator";
import { assessDefinitionOverlap, diffGrasshopper } from "../gh-diff";
import type {
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

export function useDuckerwebState(): DuckerwebState & {
	handlePasteFromClipboard: () => Promise<void>;
	handlePastedXml: (text: string) => void;
	handleFileSelected: (file: File) => Promise<void>;
	handlePasteComparison: () => Promise<void>;
	handlePastedComparisonXml: (text: string) => void;
	handleComparisonFileSelected: (file: File) => Promise<void>;
	handleClearComparison: () => void;
	handleClear: () => void;
	setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
} {
	const [xmlData, setXmlData] = useState<string | undefined>();
	const [isValidXml, setIsValidXml] = useState(false);
	const [xmlError, setXmlError] = useState("");
	const [parsedData, setParsedData] = useState<ParsedGrasshopper | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("flow");
	const [nodes, setNodes] = useState<GHNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [error, setError] = useState("");
	const [comparisonData, setComparisonData] =
		useState<ParsedGrasshopper | null>(null);
	const [diffResult, setDiffResult] = useState<GHDiffResult | null>(null);
	const [diffError, setDiffError] = useState("");
	const [fileName, setFileName] = useState("");
	const [comparisonFileName, setComparisonFileName] = useState("");
	const [comparisonRejected, setComparisonRejected] = useState(false);
	const activeRequest = useRef(0);
	const activeComparisonRequest = useRef(0);

	const resetFlowState = useCallback(() => {
		setXmlData(undefined);
		setXmlError("");
		setIsValidXml(false);
		setParsedData(null);
		setViewMode("flow");
		setNodes([]);
		setEdges([]);
		setError("");
		setComparisonData(null);
		setDiffResult(null);
		setDiffError("");
		setFileName("");
		setComparisonFileName("");
		setComparisonRejected(false);
	}, []);

	/**
	 * Shared validation+state-update path used by both clipboard paste and
	 * file drop, so the UX is identical regardless of input source.
	 */
	const ingestXml = useCallback(
		(xml: string, source: "clipboard" | "file", name?: string) => {
			const result = prepareDuckerwebImport(xml, source);

			if (!result.ok) {
				setXmlError(result.error);
				return;
			}

			setXmlData(xml);
			// Any comparison already being read captured the previous original.
			// Invalidate it before committing this replacement so it cannot publish
			// a stale diff after the new original is visible.
			activeComparisonRequest.current += 1;
			setIsValidXml(true);
			setParsedData(result.parsedData);
			setNodes(result.nodes);
			setEdges(result.edges);
			setViewMode((currentView) =>
				resolveDuckerwebImportView(currentView, source)
			);
			setXmlError("");
			setError("");
			setComparisonData(null);
			setDiffResult(null);
			setDiffError("");
			setFileName(name ?? "Clipboard GhXml");
			setComparisonFileName("");
			setComparisonRejected(false);
		},
		[]
	);

	const ingestComparisonXml = useCallback(
		(xml: string, source: "clipboard" | "file", name?: string) => {
			if (!parsedData) return;
			const result = prepareDuckerwebImport(xml, source);

			if (!result.ok) {
				setComparisonRejected(false);
				setDiffError(result.error);
				return;
			}
			const overlap = assessDefinitionOverlap(parsedData, result.parsedData);
			setComparisonFileName(name ?? "Clipboard GhXml");
			if (!overlap.isComparable) {
				setComparisonRejected(true);
				setComparisonData(null);
				setDiffResult(null);
				setDiffError(
					`Only ${Math.round(overlap.ratio * 100)}% component overlap (${overlap.matchedCount} of ${overlap.smallerCount} matched). Ducker requires at least 25% overlap${overlap.smallerCount > 5 ? " and 3 matched components" : ""}.`
				);
				setViewMode("diff");
				return;
			}

			setComparisonData(result.parsedData);
			setComparisonRejected(false);
			setDiffResult(diffGrasshopper(parsedData, result.parsedData));
			setDiffError("");
			setViewMode("diff");
		},
		[parsedData]
	);
	const applyPastedXml = useCallback(
		(text: string, requestId: number) => {
			if (requestId !== activeRequest.current) return;
			if (text.length === 0) {
				setXmlError("Clipboard is empty");
				return;
			}
			ingestXml(text, "clipboard");
		},
		[ingestXml]
	);
	const handlePastedXml = useCallback(
		(text: string) => {
			const requestId = ++activeRequest.current;
			setXmlError("");
			setError("");
			applyPastedXml(text, requestId);
		},
		[applyPastedXml]
	);

	const handlePasteFromClipboard = useCallback(async () => {
		const requestId = ++activeRequest.current;
		setXmlError("");
		setError("");

		try {
			const text = await navigator.clipboard.readText();
			applyPastedXml(text, requestId);
		} catch (err) {
			if (requestId !== activeRequest.current) return;
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	}, [applyPastedXml]);

	const handleFileSelected = useCallback(
		async (file: File) => {
			const requestId = ++activeRequest.current;
			setXmlError("");
			setError("");
			try {
				const xml = await ghFileToGhXml(file);
				if (requestId !== activeRequest.current) return;
				ingestXml(xml, "file", file.name);
			} catch (err) {
				if (requestId !== activeRequest.current) return;
				if (err instanceof GhFileError) {
					setXmlError(err.message);
				} else {
					setXmlError(
						`Failed to read file "${file.name}": \n${
							err instanceof Error ? err.message : String(err)
						}`
					);
				}
			}
		},
		[ingestXml]
	);

	const handleClear = useCallback(() => {
		activeRequest.current += 1;
		activeComparisonRequest.current += 1;
		resetFlowState();
	}, [resetFlowState]);
	const applyPastedComparisonXml = useCallback(
		(text: string, requestId: number) => {
			if (requestId !== activeComparisonRequest.current) return;
			if (text.length === 0) {
				setDiffError("Clipboard is empty");
				return;
			}
			ingestComparisonXml(text, "clipboard");
		},
		[ingestComparisonXml]
	);
	const handlePastedComparisonXml = useCallback(
		(text: string) => {
			const requestId = ++activeComparisonRequest.current;
			setDiffError("");
			setComparisonRejected(false);
			applyPastedComparisonXml(text, requestId);
		},
		[applyPastedComparisonXml]
	);

	const handlePasteComparison = useCallback(async () => {
		const requestId = ++activeComparisonRequest.current;
		setDiffError("");
		setComparisonRejected(false);

		try {
			const text = await navigator.clipboard.readText();
			applyPastedComparisonXml(text, requestId);
		} catch (err) {
			if (requestId !== activeComparisonRequest.current) return;
			setDiffError("Failed to read clipboard contents: \n" + String(err));
		}
	}, [applyPastedComparisonXml]);

	const handleComparisonFileSelected = useCallback(
		async (file: File) => {
			const requestId = ++activeComparisonRequest.current;
			setDiffError("");
			setComparisonRejected(false);
			try {
				const xml = await ghFileToGhXml(file);
				if (requestId !== activeComparisonRequest.current) return;
				ingestComparisonXml(xml, "file", file.name);
			} catch (err) {
				if (requestId !== activeComparisonRequest.current) return;
				setDiffError(
					err instanceof GhFileError
						? err.message
						: `Failed to read file "${file.name}": \n${
								err instanceof Error ? err.message : String(err)
							}`
				);
			}
		},
		[ingestComparisonXml]
	);

	const handleClearComparison = useCallback(() => {
		activeComparisonRequest.current += 1;
		setComparisonData(null);
		setDiffResult(null);
		setDiffError("");
		setComparisonFileName("");
		setComparisonRejected(false);
	}, []);

	return {
		xmlData,
		isValidXml,
		xmlError,
		parsedData,
		viewMode,
		nodes,
		edges,
		error,
		comparisonData,
		diffResult,
		diffError,
		fileName,
		comparisonFileName,
		comparisonRejected,
		handlePasteFromClipboard,
		handlePastedXml,
		handleFileSelected,
		handlePasteComparison,
		handlePastedComparisonXml,
		handleComparisonFileSelected,
		handleClearComparison,
		handleClear,
		setViewMode,
	};
}
