import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests do not need the application plugins, prerendering, or Nitro server.
export default defineConfig({
	resolve: {
		alias: {
			"@convex": fileURLToPath(new URL("./convex", import.meta.url)),
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			parser: fileURLToPath(new URL("./parser", import.meta.url)),
		},
	},
});
