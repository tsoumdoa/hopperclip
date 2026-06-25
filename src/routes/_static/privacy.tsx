import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy from "@/app/privacy/page";

export const Route = createFileRoute("/_static/privacy")({
	head: () => ({
		meta: [{ title: "Privacy Policy | Hopper Clip" }],
	}),
	component: PrivacyPolicy,
});
