import { createFileRoute } from "@tanstack/react-router";
import { handleShareAccess } from "@/server/share-gateway.server";

export const Route = createFileRoute("/api/share")({
	server: {
		handlers: {
			POST: ({ request }) => handleShareAccess(request),
		},
	},
});
