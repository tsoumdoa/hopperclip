import { createFileRoute } from "@tanstack/react-router";
import { LandingShell } from "@/app/landing/shell";
import { Lp1DiffTheater } from "@/app/landing/variants/lp1-diff-theater";

export const Route = createFileRoute("/_static/lp1")({
	head: () => ({
		meta: [
			{
				title: "Hopper Clip — Diff Theater (landing review)",
			},
		],
	}),
	component: () => (
		<LandingShell active="/lp1">
			<Lp1DiffTheater />
		</LandingShell>
	),
});
