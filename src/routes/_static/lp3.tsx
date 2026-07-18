import { createFileRoute } from "@tanstack/react-router";
import { LandingShell } from "@/app/landing/shell";
import { Lp3ExpressionLab } from "@/app/landing/variants/lp3-expression-lab";

export const Route = createFileRoute("/_static/lp3")({
	head: () => ({
		meta: [
			{
				title: "Hopper Clip — Expression Lab (landing review)",
			},
		],
	}),
	component: () => (
		<LandingShell active="/lp3">
			<Lp3ExpressionLab />
		</LandingShell>
	),
});
