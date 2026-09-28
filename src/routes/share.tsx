import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/app/components/page-shell";
import ShareView from "@/app/share/components/share-view";
import ShareError from "@/app/share/error";
import { ShareLinkUidSchema } from "@/types/types";

export const Route = createFileRoute("/share")({
	ssr: false,
	validateSearch: (search) => ({
		token: ShareLinkUidSchema.optional().parse(search.token),
	}),
	head: () => ({
		meta: [{ title: "Shared snippet | Hopper Clip" }],
	}),
	errorComponent: ShareError,
	component: SharePage,
});

function SharePage() {
	return (
		<PageShell>
			<ShareView />
		</PageShell>
	);
}
