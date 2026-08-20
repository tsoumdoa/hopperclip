import { UserProfile } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import Header from "@/app/components/header";

export const Route = createFileRoute("/_authed/user-profile/$")({
	component: UserProfilePage,
});

function UserProfilePage() {
	return (
		<div className="min-h-screen bg-black p-4 font-sans text-white md:p-6">
			<div className="mx-auto max-w-400">
				<Header />
				<main className="flex justify-center py-8">
					<UserProfile />
				</main>
			</div>
		</div>
	);
}
