import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const clientEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined;

export const env = createEnv({
	server: {
		CLERK_SECRET_KEY: z.string(),
		R2_ACCESS_KEY_ID: z.string(),
		R2_SECRET_ACCESS_KEY: z.string(),
		R2_URL: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		JWT_PUBLIC_KEY: z.string(),
		JWT_PRIVATE_KEY: z.string(),
		JWT_ISSUER: z.string(),
		JWT_AUDIENCE: z.string(),
	},
	client: {
		VITE_CLERK_PUBLISHABLE_KEY: z.string(),
		VITE_CONVEX_URL: z.string(),
		VITE_POSTHOG_KEY: z.string(),
		VITE_POSTHOG_HOST: z.url(),
		VITE_HOSTING_DOMAIN: z.url(),
		VITE_CF_WORKER: z.url(),
	},
	clientPrefix: "VITE_",
	runtimeEnv: {
		CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
		R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
		R2_URL: process.env.R2_URL,
		NODE_ENV: process.env.NODE_ENV,
		JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
		JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
		JWT_ISSUER: process.env.JWT_ISSUER,
		JWT_AUDIENCE: process.env.JWT_AUDIENCE,
		VITE_CLERK_PUBLISHABLE_KEY:
			clientEnv?.VITE_CLERK_PUBLISHABLE_KEY ??
			clientEnv?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
			process.env.VITE_CLERK_PUBLISHABLE_KEY ??
			process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		VITE_CONVEX_URL:
			clientEnv?.VITE_CONVEX_URL ??
			clientEnv?.NEXT_PUBLIC_CONVEX_URL ??
			process.env.VITE_CONVEX_URL ??
			process.env.NEXT_PUBLIC_CONVEX_URL,
		VITE_POSTHOG_KEY:
			clientEnv?.VITE_POSTHOG_KEY ??
			clientEnv?.NEXT_PUBLIC_POSTHOG_KEY ??
			process.env.VITE_POSTHOG_KEY ??
			process.env.NEXT_PUBLIC_POSTHOG_KEY,
		VITE_POSTHOG_HOST:
			clientEnv?.VITE_POSTHOG_HOST ??
			clientEnv?.NEXT_PUBLIC_POSTHOG_HOST ??
			process.env.VITE_POSTHOG_HOST ??
			process.env.NEXT_PUBLIC_POSTHOG_HOST,
		VITE_HOSTING_DOMAIN:
			clientEnv?.VITE_HOSTING_DOMAIN ??
			clientEnv?.NEXT_PUBLIC_HOSTING_DOMAIN ??
			process.env.VITE_HOSTING_DOMAIN ??
			process.env.NEXT_PUBLIC_HOSTING_DOMAIN,
		VITE_CF_WORKER:
			clientEnv?.VITE_CF_WORKER ??
			clientEnv?.NEXT_PUBLIC_CF_WORKER ??
			process.env.VITE_CF_WORKER ??
			process.env.NEXT_PUBLIC_CF_WORKER,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
