import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { env } from "@/env";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (posthog.__loaded) {
			return;
		}

		posthog.init(env.VITE_POSTHOG_KEY, {
			api_host: env.VITE_POSTHOG_HOST,
			// SPA navigations (TanStack Router) use the History API.
			capture_pageview: "history_change",
			capture_pageleave: true,
			capture_exceptions: true,
			debug: import.meta.env.DEV,
		});
	}, []);

	return <PHProvider client={posthog}>{children}</PHProvider>;
}
