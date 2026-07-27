import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	isStaticPrerenderPath,
	STATIC_PRERENDER_PATHS,
} from "./src/lib/static-pages";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Pragmatic CSP: Clerk / Convex / PostHog / Google Fonts; unsafe-inline|eval for Vite/TanStack without nonces. */
const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self'",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.hopperclip.com",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com data:",
	"img-src 'self' data: blob: https:",
	"connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.posthog.com",
	"frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
	"worker-src 'self' blob:",
	"upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = {
	"Content-Security-Policy": CONTENT_SECURITY_POLICY,
	"Strict-Transport-Security":
		"max-age=31536000; includeSubDomains; preload",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	"Cross-Origin-Opener-Policy": "same-origin",
} as const;

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

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	migrateNextPublicEnv(env);

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
						headers: { ...SECURITY_HEADERS },
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
