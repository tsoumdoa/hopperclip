import { createFileRoute } from "@tanstack/react-router";
import TermsOfService from "@/app/terms-of-service/page";

export const Route = createFileRoute("/_static/terms-of-service")({
	head: () => ({
		meta: [{ title: "Terms of Service | Hopper Clip" }],
	}),
	component: TermsOfService,
});
