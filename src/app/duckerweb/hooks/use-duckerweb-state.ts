import { useState, useCallback } from "react";
import { buildGhJson } from "parser/src/parser";
import { validateGhXml } from "../../utils/gh-xml";
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

	const handlePasteFromClipboard = useCallback(async () => {
		resetFlowState();

		try {
			const text = await navigator.clipboard.readText();
			if (text.length === 0) {
				setXmlError("Clipboard is empty");
				return;
			}

			const { isValid, errorMsg } = validateGhXml(text);

			if (isValid) {
				setIsValidXml(true);
				setXmlData(text);
				parseXml(text);
			} else {
				setXmlError("Pasted GhXml is not valid: \n" + errorMsg);
			}
		} catch (err) {
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	}, [resetFlowState]);

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
		handleClear,
		setViewMode,
	};
}
