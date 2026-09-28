import { UserProfile } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/app/components/page-shell";

export const Route = createFileRoute("/_authed/user-profile/$")({
	component: UserProfilePage,
});

function UserProfilePage() {
	return (
		<PageShell>
			<div className="flex justify-center py-8">
				<UserProfile />
			</div>
		</PageShell>
	);
}
