import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState, useEffect } from "react";
import { decompress } from "../../utils/gzip";
import { buildGhJson } from "parser/src/parser";
import { generateFlowData } from "../../duckerweb/gh-flow-generator";
import type { GHNode } from "../../duckerweb/types/type";
import type { Edge } from "@xyflow/react";
import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";

export function useShareFlowState(shareToken: string) {
	const getPresignedUrl = useAction(api.ghPublicAction.generateShareableLink);

	const [nodes, setNodes] = useState<GHNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [decodedXml, setDecodedXml] = useState<string | undefined>();
	useEffect(() => {
		let cancelled = false;
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		setDecodedXml(undefined);
		setNodes([]);
		setEdges([]);

		const fetchAndParse = async () => {
			try {
				const presignedUrl = await getPresignedUrl({ shareToken });
				if (cancelled) return;

				const res = await fetch(presignedUrl, {
					signal: controller.signal,
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
				if (cancelled) return;
				if (blob.size > MAX_COMPRESSED_GH_XML_BYTES) {
					throw new Error("GhXml download is too large");
				}
				const uncompressed = await decompress(await blob.arrayBuffer());
				if (cancelled) return;
				const decoded = new TextDecoder().decode(uncompressed);
				const parsed = buildGhJson(decoded, { includeVisuals: true });
				const flowData = generateFlowData(parsed);
				if (cancelled) return;
				setDecodedXml(decoded);
				setNodes(flowData.nodes as GHNode[]);
				setEdges(flowData.edges);
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Failed to load flow data");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void fetchAndParse();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [getPresignedUrl, shareToken]);

	return { nodes, edges, decodedXml, loading, error };
}
