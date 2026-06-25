import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import { isStaticPrerenderPath, STATIC_PRERENDER_PATHS } from "./src/lib/static-pages";

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
			proxy: {
				"/ingest/static": {
					target: "https://us-assets.i.posthog.com",
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/ingest\/static/, "/static"),
				},
				"/ingest/decide": {
					target: "https://us.i.posthog.com",
					changeOrigin: true,
					rewrite: () => "/decide",
				},
				"/ingest": {
					target: "https://us.i.posthog.com",
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/ingest/, ""),
				},
			},
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
			nitro(),
		],
		resolve: {
			tsconfigPaths: true,
			alias: [
				{
					find: "use-sync-external-store/shim/index.js",
					replacement: "react",
				},
			],
		},
	};
});
