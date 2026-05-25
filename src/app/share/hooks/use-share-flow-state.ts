import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { decompress } from "../../utils/gzip";
import { buildGhJson } from "parser/sand/src/parser";
import { generateFlowData } from "../../duckerweb/gh-flow-generator";
import type { GHNode } from "../../duckerweb/types/type";
import type { Edge } from "@xyflow/react";

export function useShareFlowState(shareToken: string) {
	const getPresignedUrl = useAction(api.ghPublicAction.generateShareableLink);

	const [nodes, setNodes] = useState<GHNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [decodedXml, setDecodedXml] = useState<string | undefined>();
	const hasFetched = useRef(false);

	const fetchAndParse = useCallback(async () => {
		if (hasFetched.current) return;
		hasFetched.current = true;

		try {
			setLoading(true);
			const presignedUrl = await getPresignedUrl({ shareToken });

			const res = await fetch(presignedUrl, {
				cache: "no-store",
				headers: {
					"Content-Encoding": "gzip",
					"Content-Type": "application/gzip",
				},
			});

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			const blob = await res.blob();
			const uncompressed = await decompress(await blob.arrayBuffer());
			const decoded = new TextDecoder().decode(uncompressed);
			setDecodedXml(decoded);

			const parsed = buildGhJson(decoded, { includeVisuals: true });
			const flowData = generateFlowData(parsed);
			setNodes(flowData.nodes as GHNode[]);
			setEdges(flowData.edges);
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Failed to load flow data"
			);
		} finally {
			setLoading(false);
		}
	}, [getPresignedUrl, shareToken]);

	useEffect(() => {
		fetchAndParse();
	}, [fetchAndParse]);

	return { nodes, edges, decodedXml, loading, error };
}
