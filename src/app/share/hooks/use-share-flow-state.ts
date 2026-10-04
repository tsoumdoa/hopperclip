import { useState, useEffect } from "react";
import { decompress } from "../../utils/gzip";
import { buildGhJson } from "parser/src/parser";
import { generateFlowData } from "../../duckerweb/gh-flow-generator";
import type { GHNode } from "../../duckerweb/types/type";
import type { Edge } from "@xyflow/react";
import { MAX_COMPRESSED_GH_XML_BYTES, type GetSharedPost } from "@/types/types";
import { requestSharedSnippet, ShareAccessError } from "../share-access";

export function useShareFlowState(shareToken: string) {
	const [sharedPost, setSharedPost] = useState<GetSharedPost | undefined>();
	const [accessError, setAccessError] = useState<string | null>(null);
	const [retryAt, setRetryAt] = useState(0);
	const [attempt, setAttempt] = useState(0);
	const [nodes, setNodes] = useState<GHNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [decodedXml, setDecodedXml] = useState<string | undefined>();
	useEffect(() => {
		let cancelled = false;
		const controller = new AbortController();
		setLoading(true);
		setSharedPost(undefined);
		setAccessError(null);
		setRetryAt(0);
		setError(null);
		setDecodedXml(undefined);
		setNodes([]);
		setEdges([]);

		const fetchAndParse = async () => {
			let hasAccess = false;
			try {
				const result = await requestSharedSnippet(
					shareToken,
					controller.signal
				);
				if (cancelled) return;
				setSharedPost(result?.sharedPost ?? null);
				if (!result) return;
				hasAccess = true;

				const res = await fetch(result.downloadUrl, {
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
					if (hasAccess) {
						setError(
							e instanceof Error ? e.message : "Failed to load flow data"
						);
					} else {
						setAccessError(
							e instanceof ShareAccessError
								? e.message
								: "This snippet could not be loaded. Please try again."
						);
						setRetryAt(
							Date.now() +
								(e instanceof ShareAccessError ? e.retryAfterSeconds * 1000 : 0)
						);
					}
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
	}, [shareToken, attempt]);

	return {
		sharedPost,
		accessError,
		retryAt,
		retry: () => setAttempt((value) => value + 1),
		nodes,
		edges,
		decodedXml,
		loading,
		error,
	};
}
