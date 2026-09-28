/// <reference types="vite/client" />
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { PageShell } from "@/app/components/page-shell";
import { createServerFn } from "@tanstack/react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { PostHogProvider } from "@/app/providers/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";
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
			{
				name: "description",
				content:
					"Save, find, share, and inspect your Grasshopper definitions from the browser.",
			},
			{ name: "theme-color", content: "#000000" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
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
	notFoundComponent: NotFound,
});

const clerkAppearance = {
	variables: {
		colorPrimary: "#86efac",
		colorPrimaryForeground: "#052e16",
		colorBackground: "#171717",
		colorForeground: "#fafafa",
		colorMutedForeground: "#a3a3a3",
		colorNeutral: "#fafafa",
		colorInput: "#0a0a0a",
		colorInputForeground: "#fafafa",
		colorModalBackdrop: "rgba(0, 0, 0, 0.7)",
		borderRadius: "0.625rem",
		fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
	},
};

function NotFound() {
	return (
		<PageShell>
			<div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
				<p className="font-mono text-xs tracking-[0.2em] text-green-300/80 uppercase">
					404
				</p>
				<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
					This page wandered off the canvas
				</h1>
				<p className="max-w-md text-neutral-400">
					The link may be broken, or the page may have moved.
				</p>
				<Link
					to="/"
					className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-300 px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-green-200"
				>
					Back to home
				</Link>
			</div>
		</PageShell>
	);
}

function RootComponent() {
	const [queryClient] = useState(() => new QueryClient());
	const [convex] = useState(() => new ConvexReactClient(env.VITE_CONVEX_URL));

	return (
		<ClerkProvider appearance={clerkAppearance}>
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
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body className="bg-background text-foreground font-sans antialiased">
				{children}
				<Toaster />
				<Scripts />
			</body>
		</html>
	);
}
