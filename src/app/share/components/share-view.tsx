import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useValidateShareToken } from "../hooks/use-validate-uid";
import GhShareCard from "./share-card";
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
	const flowState = useShareFlowState(token);
	const { sharedPost } = flowState;
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		setNow(Date.now());
		if (!flowState.retryAt) return;
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [flowState.retryAt]);
	const retrySeconds = Math.max(0, Math.ceil((flowState.retryAt - now) / 1000));

	if (flowState.accessError) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
				<p role="alert">{flowState.accessError}</p>
				<Button onClick={flowState.retry} disabled={retrySeconds > 0}>
					{retrySeconds > 0 ? `Try again in ${retrySeconds}s` : "Try again"}
				</Button>
			</div>
		);
	}

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
