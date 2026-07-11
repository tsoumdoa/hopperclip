import { useState, useCallback, useRef } from "react";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { validateGhXml } from "../../utils/gh-xml";
import { GhFileError, ghFileToGhXml } from "../../utils/gh-file";
import { generateFlowData } from "../gh-flow-generator";
import type {
	DuckerwebImportResult,
	DuckerwebState,
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
	const activeRequest = useRef(0);

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

	/**
	 * Shared validation+state-update path used by both clipboard paste and
	 * file drop, so the UX is identical regardless of input source.
	 */
	const ingestXml = useCallback((xml: string, source: "clipboard" | "file") => {
		const result = prepareDuckerwebImport(xml, source);

		if (!result.ok) {
			setXmlError(result.error);
			return;
		}

		setXmlData(xml);
		setIsValidXml(true);
		setParsedData(result.parsedData);
		setNodes(result.nodes);
		setEdges(result.edges);
		setXmlError("");
		setError("");
	}, []);

	const handlePasteFromClipboard = useCallback(async () => {
		const requestId = ++activeRequest.current;
		setXmlError("");
		setError("");

		try {
			const text = await navigator.clipboard.readText();
			if (requestId !== activeRequest.current) return;
			if (text.length === 0) {
				setXmlError("Clipboard is empty");
				return;
			}
			ingestXml(text, "clipboard");
		} catch (err) {
			if (requestId !== activeRequest.current) return;
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	}, [ingestXml]);

	const handleFileSelected = useCallback(
		async (file: File) => {
			const requestId = ++activeRequest.current;
			setXmlError("");
			setError("");
			try {
				const xml = await ghFileToGhXml(file);
				if (requestId !== activeRequest.current) return;
				ingestXml(xml, "file");
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
