"use client";
import { api } from "@convex/_generated/api";
import { useValidateShareToken } from "../hooks/use-validate-uid";
import GhShareCard from "./share-card";
import { useQuery } from "convex/react";
import { useShareFlowState } from "../hooks/use-share-flow-state";
import { useState } from "react";
import type { ViewMode } from "../../duckerweb/types/type";

export default function ShareView() {
	const { isValidToken, validatedToken } = useValidateShareToken();
	const [viewMode, setViewMode] = useState<ViewMode>("list");

	const sharedPost = useQuery(api.ghCard.getSharedPost, {
		shareToken: validatedToken ?? "",
	});

	const flowState = useShareFlowState(validatedToken ?? "");

	if (!isValidToken || !sharedPost) {
		return <div>Loading...</div>;
	}

	return (
		<div
			className={`flex w-full px-2 ${
				viewMode === "flow" ? "max-w-6xl" : "max-w-xl"
			}`}
		>
			<GhShareCard
				sharedPost={sharedPost}
				flowNodes={flowState.nodes}
				flowEdges={flowState.edges}
				flowLoading={flowState.loading}
				flowError={flowState.error}
				decodedXml={flowState.decodedXml}
				viewMode={viewMode}
				onSetViewMode={setViewMode}
			/>
		</div>
	);
}
