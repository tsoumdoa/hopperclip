/// <reference types="vite/client" />
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { PostHogProvider } from "@/app/providers/PostHogProvider";
import appCss from "@/styles/app.css?url";
import { env } from "@/env";
import { useState } from "react";

export const fetchClerkAuth = createServerFn({ method: "GET" }).handler(
	async () => {
		const { userId } = await auth();
		return { userId };
	}
);

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Hopper Clip",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap",
			},
		],
	}),
	component: RootComponent,
	notFoundComponent: () => (
		<div className="flex min-h-screen items-center justify-center text-neutral-500">
			Not Found
		</div>
	),
});

function RootComponent() {
	const [queryClient] = useState(() => new QueryClient());
	const [convex] = useState(() => new ConvexReactClient(env.VITE_CONVEX_URL));

	return (
		<ClerkProvider>
			<PostHogProvider>
				<QueryClientProvider client={queryClient}>
					<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
						<RootDocument>
							<Outlet />
						</RootDocument>
					</ConvexProviderWithClerk>
				</QueryClientProvider>
			</PostHogProvider>
		</ClerkProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
