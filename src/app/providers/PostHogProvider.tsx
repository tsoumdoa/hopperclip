"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useRouterState } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { env } from "@/env";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		posthog.init(env.VITE_POSTHOG_KEY, {
			api_host: "/ingest",
			ui_host: "https://us.posthog.com",
			capture_pageview: "history_change",
			capture_pageleave: true,
			capture_exceptions: true,
			debug: false,
		});
	}, []);

	return (
		<PHProvider client={posthog}>
			<SuspendedPostHogPageView />
			{children}
		</PHProvider>
	);
}

function PostHogPageView() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const searchStr = useRouterState({ select: (s) => s.location.searchStr });
	const posthogClient = usePostHog();

	useEffect(() => {
		if (pathname && posthogClient) {
			let url = window.origin + pathname;
			if (searchStr) {
				url += searchStr;
			}
			posthogClient.capture("$pageview", { $current_url: url });
		}
	}, [pathname, searchStr, posthogClient]);

	return null;
}

function SuspendedPostHogPageView() {
	return (
		<Suspense fallback={null}>
			<PostHogPageView />
		</Suspense>
	);
}
