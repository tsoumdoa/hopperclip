import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
// nitro 3.x beta is currently required by TanStack Start — track stable releases.
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	isStaticPrerenderPath,
	STATIC_PRERENDER_PATHS,
} from "./src/lib/static-pages";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Pragmatic CSP: Clerk / Convex / PostHog / R2 / Google Fonts. */
function buildSecurityHeaders({
	dev,
	r2Origin,
}: {
	dev: boolean;
	r2Origin: string;
}) {
	const contentSecurityPolicy = [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		// challenges.cloudflare.com: Clerk bot protection (Turnstile);
		// us-assets.i.posthog.com: lazy-loaded session-recording + remote-config scripts.
		// 'unsafe-inline' is required in production: TanStack Start streams inline
		// hydration scripts and several routes are prerendered to static HTML, so
		// per-request nonces can never match (Clerk also requires it without a full
		// strict-dynamic setup). 'unsafe-eval' is only needed by Vite's dev transforms.
		// 'wasm-unsafe-eval' is required by Shiki's Oniguruma WASM highlighter.
		`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://clerk.hopperclip.com https://challenges.cloudflare.com https://us-assets.i.posthog.com`,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' data: blob: https:",
		// r2Origin: the browser fetches presigned R2 URLs directly (share page, GH XML download).
		`connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com https://clerk.hopperclip.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.posthog.com ${r2Origin}`,
		"frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
		"worker-src 'self' blob:",
		// upgrade-insecure-requests would rewrite dev-server http/ws requests to https and break `vite dev`.
		...(dev ? [] : ["upgrade-insecure-requests"]),
	].join("; ");

	return {
		"Content-Security-Policy": contentSecurityPolicy,
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
		"Cross-Origin-Opener-Policy": "same-origin",
	};
}

const nextPublicToViteAliases: [string, string][] = [
	["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY"],
	["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_PUBLISHABLE_KEY"],
	["NEXT_PUBLIC_CONVEX_URL", "VITE_CONVEX_URL"],
	["NEXT_PUBLIC_POSTHOG_KEY", "VITE_POSTHOG_KEY"],
	["NEXT_PUBLIC_POSTHOG_HOST", "VITE_POSTHOG_HOST"],
	["NEXT_PUBLIC_HOSTING_DOMAIN", "VITE_HOSTING_DOMAIN"],
	["NEXT_PUBLIC_CF_WORKER", "VITE_CF_WORKER"],
];

function migrateNextPublicEnv(env: Record<string, string>) {
	for (const [from, to] of nextPublicToViteAliases) {
		const value = env[from] ?? process.env[from];
		if (value && !process.env[to]) {
			process.env[to] = value;
		}
	}
}

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	migrateNextPublicEnv(env);

	// Presigned R2 URLs share the bucket origin. A *.r2.cloudflarestorage.com
	// wildcard would whitelist every R2 bucket (including attacker-controlled
	// ones), so builds must know the exact origin.
	const r2Url = env.R2_URL ?? process.env.R2_URL;
	if (!r2Url && command === "build") {
		throw new Error(
			"R2_URL must be set at build time: the CSP connect-src needs the exact R2 bucket origin."
		);
	}
	const securityHeaders = buildSecurityHeaders({
		// `command` stays "serve" under `vite dev --mode <anything>`, unlike `mode`.
		dev: command === "serve",
		r2Origin: r2Url
			? new URL(r2Url).origin
			: "https://*.r2.cloudflarestorage.com",
	});

	return {
		envPrefix: ["VITE_", "NEXT_PUBLIC_"],
		server: {
			port: 3000,
		},
		plugins: [
			tailwindcss(),
			tanstackStart({
				srcDirectory: "src",
				prerender: {
					enabled: true,
					autoStaticPathsDiscovery: false,
					crawlLinks: true,
					concurrency: 4,
					filter: (page) => isStaticPrerenderPath(page.path),
				},
				pages: STATIC_PRERENDER_PATHS.map((path) => ({ path })),
			}),
			viteReact(),
			nitro({
				routeRules: {
					"/**": {
						headers: securityHeaders,
					},
				},
			}),
		],
		resolve: {
			alias: [
				{
					find: "use-sync-external-store/shim/index.js",
					replacement: "react",
				},
				{
					find: /^@convex\/(.*)/,
					replacement: `${path.resolve(root, "convex")}/$1`,
				},
				{
					find: /^@\/(.*)/,
					replacement: `${path.resolve(root, "src")}/$1`,
				},
				{
					find: /^parser\/(.*)/,
					replacement: `${path.resolve(root, "parser")}/$1`,
				},
			],
		},
	};
});
