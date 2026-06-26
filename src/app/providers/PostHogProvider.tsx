"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
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

	return <PHProvider client={posthog}>{children}</PHProvider>;
}
