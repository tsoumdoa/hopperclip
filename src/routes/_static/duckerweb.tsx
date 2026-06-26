import { createFileRoute } from "@tanstack/react-router";
import DuckerWebPage from "@/app/duckerweb/page";

export const Route = createFileRoute("/_static/duckerweb")({
	head: () => ({
		meta: [{ title: "DuckerWeb | Hopper Clip" }],
	}),
	component: DuckerWebPage,
});
