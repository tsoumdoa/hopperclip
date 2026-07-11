import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(root, "../..");

export default defineConfig({
	root,
	plugins: [tailwindcss(), viteReact()],
	resolve: {
		alias: [
			{
				find: /^@\/(.*)/,
				replacement: `${path.resolve(workspaceRoot, "src")}/$1`,
			},
			{
				find: /^parser\/(.*)/,
				replacement: `${path.resolve(workspaceRoot, "parser")}/$1`,
			},
		],
	},
	server: {
		port: 4310,
		host: "127.0.0.1",
	},
});
