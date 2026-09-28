import { api } from "@convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useValidateShareToken } from "../hooks/use-validate-uid";
import GhShareCard from "./share-card";
import { useQuery } from "convex/react";
import { useShareFlowState } from "../hooks/use-share-flow-state";

function ShareLoading() {
	return (
		<div
			className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500"
			role="status"
		>
			<Loader2 className="size-4 animate-spin" aria-hidden />
			Loading shared snippet…
		</div>
	);
}

export default function ShareView() {
	const { isValidToken, validatedToken } = useValidateShareToken();

	if (!isValidToken || !validatedToken) {
		return <ShareLoading />;
	}

	return <ShareContent key={validatedToken} token={validatedToken} />;
}

function ShareContent({ token }: { token: string }) {
	const sharedPost = useQuery(api.ghCard.getSharedPost, {
		shareToken: token,
	});

	const flowState = useShareFlowState(token);

	// undefined = still loading; null = expired or invalid token
	if (sharedPost === undefined) {
		return <ShareLoading />;
	}

	return (
		<div
			className={
				sharedPost
					? "flex w-full flex-col"
					: "flex w-full flex-1 flex-col items-center justify-center"
			}
		>
			<GhShareCard
				sharedPost={sharedPost}
				flowNodes={flowState.nodes}
				flowEdges={flowState.edges}
				flowLoading={flowState.loading}
				flowError={flowState.error}
				decodedXml={flowState.decodedXml}
			/>
		</div>
	);
}
