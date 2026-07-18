import { createFileRoute } from "@tanstack/react-router";
import { LandingShell } from "@/app/landing/shell";
import { Lp5ProductTour } from "@/app/landing/variants/lp5-product-tour";

export const Route = createFileRoute("/_static/lp5")({
	head: () => ({
		meta: [
			{
				title: "Hopper Clip — Product Tour (landing review)",
			},
		],
	}),
	component: () => (
		<LandingShell active="/lp5">
			<Lp5ProductTour />
		</LandingShell>
	),
});
