import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { fetchClerkAuth } from "./__root";

export const Route = createFileRoute("/_authed")({
	ssr: false,
	beforeLoad: async () => {
		const { userId } = await fetchClerkAuth();
		if (!userId) {
			throw new Error("Not authenticated");
		}
		return { userId };
	},
	errorComponent: ({ error }) => {
		if (error.message === "Not authenticated") {
			return (
				<div className="flex min-h-screen items-center justify-center bg-black p-12">
					<SignIn routing="hash" forceRedirectUrl={window.location.href} />
				</div>
			);
		}

		throw error;
	},
	component: () => <Outlet />,
});
