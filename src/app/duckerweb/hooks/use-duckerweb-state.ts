import { useState, useCallback } from "react";
import { buildGhJson } from "parser/src/parser";
import { validateGhXml } from "../../utils/gh-xml";
import { GhFileError, ghFileToGhXml } from "../../utils/gh-file";
import { generateFlowData } from "../gh-flow-generator";
import type { ParsedGrasshopper } from "parser/src/types";
import type { GHNode, ViewMode } from "../types/type";
import type { Edge } from "@xyflow/react";

interface DuckerwebState {
	xmlData: string | undefined;
	isValidXml: boolean;
	xmlError: string;
	parsedData: ParsedGrasshopper | null;
	viewMode: ViewMode;
	nodes: GHNode[];
	edges: Edge[];
	error: string;
}

export function useDuckerwebState(): DuckerwebState & {
	handlePasteFromClipboard: () => Promise<void>;
	handleFileSelected: (file: File) => Promise<void>;
	handleClear: () => void;
	setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
} {
	const [xmlData, setXmlData] = useState<string | undefined>();
	const [isValidXml, setIsValidXml] = useState(false);
	const [xmlError, setXmlError] = useState("");
	const [parsedData, setParsedData] = useState<ParsedGrasshopper | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("list");
	const [nodes, setNodes] = useState<GHNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [error, setError] = useState("");

	const resetFlowState = useCallback(() => {
		setXmlData(undefined);
		setXmlError("");
		setIsValidXml(false);
		setParsedData(null);
		setViewMode("list");
		setNodes([]);
		setEdges([]);
		setError("");
	}, []);

	const parseXml = useCallback((xmlContent: string) => {
		setError("");

		try {
			const result = buildGhJson(xmlContent, { includeVisuals: true });
			setParsedData(result);

			const flowData = generateFlowData(result);
			setNodes(flowData.nodes as GHNode[]);
			setEdges(flowData.edges);
		} catch (e) {
			setError(
				`Failed to parse XML: ${e instanceof Error ? e.message : "Unknown error"}`
			);
		}
	}, []);

	/**
	 * Shared validation+state-update path used by both clipboard paste and
	 * file drop, so the UX is identical regardless of input source.
	 */
	const ingestXml = useCallback(
		(xml: string, source: "clipboard" | "file") => {
			resetFlowState();

			const { isValid, errorMsg } = validateGhXml(xml);

			if (isValid) {
				setIsValidXml(true);
				setXmlData(xml);
				parseXml(xml);
			} else {
				setXmlError(
					`${source === "file" ? "Selected" : "Pasted"} GhXml is not valid: \n${errorMsg}`
				);
			}
		},
		[parseXml, resetFlowState]
	);

	const handlePasteFromClipboard = useCallback(async () => {
		resetFlowState();

		try {
			const text = await navigator.clipboard.readText();
			if (text.length === 0) {
				setXmlError("Clipboard is empty");
				return;
			}
			ingestXml(text, "clipboard");
		} catch (err) {
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	}, [ingestXml, resetFlowState]);

	const handleFileSelected = useCallback(
		async (file: File) => {
			try {
				const xml = await ghFileToGhXml(file);
				ingestXml(xml, "file");
			} catch (err) {
				resetFlowState();
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
		[ingestXml, resetFlowState]
	);

	const handleClear = useCallback(() => {
		resetFlowState();
	}, [resetFlowState]);

	return {
		xmlData,
		isValidXml,
		xmlError,
		parsedData,
		viewMode,
		nodes,
		edges,
		error,
		handlePasteFromClipboard,
		handleFileSelected,
		handleClear,
		setViewMode,
	};
}
