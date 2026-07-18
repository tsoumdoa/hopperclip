import { createFileRoute } from "@tanstack/react-router";
import { LandingShell } from "@/app/landing/shell";
import { Lp4SplitStory } from "@/app/landing/variants/lp4-split-story";

export const Route = createFileRoute("/_static/lp4")({
	head: () => ({
		meta: [
			{
				title: "Hopper Clip — Split Story (landing review)",
			},
		],
	}),
	component: () => (
		<LandingShell active="/lp4">
			<Lp4SplitStory />
		</LandingShell>
	),
});
