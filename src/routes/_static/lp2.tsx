import { createFileRoute } from "@tanstack/react-router";
import { LandingShell } from "@/app/landing/shell";
import { Lp2PasteLab } from "@/app/landing/variants/lp2-paste-lab";

export const Route = createFileRoute("/_static/lp2")({
	head: () => ({
		meta: [
			{
				title: "Hopper Clip — Paste Lab (landing review)",
			},
		],
	}),
	component: () => (
		<LandingShell active="/lp2">
			<Lp2PasteLab />
		</LandingShell>
	),
});
