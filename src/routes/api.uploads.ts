import { createFileRoute } from "@tanstack/react-router";
import { handleUpload } from "@/server/upload.server";

export const Route = createFileRoute("/api/uploads")({
	server: {
		handlers: {
			POST: ({ request }) => handleUpload(request),
		},
	},
});
