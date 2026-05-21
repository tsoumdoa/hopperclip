import { useState, useCallback } from "react";
import { useFetchGhXml } from "./use-fetch-gh-xml";
import { buildGhJson } from "parser/sand/src/parser";
import { generateFlowData } from "../duckerweb/gh-flow-generator";
import type { ParsedGrasshopper } from "parser/sand/src/types";
import type { GHNode } from "../duckerweb/types/type";
import type { Edge } from "@xyflow/react";

export interface ScriptMetrics {
	GhVersion: string;
	componentsCount: number;
	uniqueCount: number;
	ghLibs: Array<{ name: string; author?: string; version: string }>;
}

interface ScriptMetricsState {
	metrics: ScriptMetrics | null;
	nodes: GHNode[];
	edges: Edge[];
	parsedData: ParsedGrasshopper | null;
	loading: boolean;
	error: string | null;
	loadMetrics: (bucketUrl: string) => Promise<void>;
	reset: () => void;
}

export function useScriptMetrics(): ScriptMetricsState {
	const [metrics, setMetrics] = useState<ScriptMetrics | null>(null);
	const [nodes, setNodes] = useState<GHNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [parsedData, setParsedData] = useState<ParsedGrasshopper | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { downloadData } = useFetchGhXml();

	const loadMetrics = useCallback(
		async (bucketUrl: string) => {
			setLoading(true);
			setError(null);

			try {
				const decoded = await downloadData(bucketUrl);
				const parsed = buildGhJson(decoded, { includeVisuals: true });
				setParsedData(parsed);

				const componentsCount = Object.keys(parsed.components).length;
				const ghLibs = parsed.metadata?.libraries;

				const guidSet = new Set<string>();
				for (const comp of Object.values(parsed.components)) {
					guidSet.add(comp.instanceGuid);
				}
				const uniqueCount = guidSet.size;

				setMetrics({
					GhVersion: parsed.version,
					componentsCount,
					uniqueCount,
					ghLibs: ghLibs ?? [],
				});

				const flowData = generateFlowData(parsed);
				setNodes(flowData.nodes as GHNode[]);
				setEdges(flowData.edges);
			} catch (e) {
				setError(
					e instanceof Error ? e.message : "Failed to load script metrics"
				);
			} finally {
				setLoading(false);
			}
		},
		[downloadData]
	);

	const reset = useCallback(() => {
		setMetrics(null);
		setNodes([]);
		setEdges([]);
		setParsedData(null);
		setLoading(false);
		setError(null);
	}, []);

	return {
		metrics,
		nodes,
		edges,
		parsedData,
		loading,
		error,
		loadMetrics,
		reset,
	};
}
