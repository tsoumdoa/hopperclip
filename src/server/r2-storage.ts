import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
export const fetchGhcardsUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const { userId } = await auth();
		const user = userId ? await clerkClient().users.getUser(userId) : null;

		return {
			userId,
			username: user?.username || user?.firstName || "User",
		};
	}
);
