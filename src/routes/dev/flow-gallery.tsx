import { createFileRoute, notFound } from "@tanstack/react-router";
import FlowGallery from "@/app/dev/flow-gallery";

export const Route = createFileRoute("/dev/flow-gallery")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	head: () => ({
		meta: [{ title: "Flow Gallery | Hopper Clip" }],
	}),
	component: FlowGallery,
});
