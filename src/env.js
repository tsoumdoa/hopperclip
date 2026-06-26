import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const clientEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined;

const processEnv =
	typeof process !== "undefined" && process.env
		? process.env
		: {};

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
		CLERK_SECRET_KEY: processEnv.CLERK_SECRET_KEY,
		R2_ACCESS_KEY_ID: processEnv.R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY: processEnv.R2_SECRET_ACCESS_KEY,
		R2_URL: processEnv.R2_URL,
		NODE_ENV: processEnv.NODE_ENV,
		JWT_PUBLIC_KEY: processEnv.JWT_PUBLIC_KEY,
		JWT_PRIVATE_KEY: processEnv.JWT_PRIVATE_KEY,
		JWT_ISSUER: processEnv.JWT_ISSUER,
		JWT_AUDIENCE: processEnv.JWT_AUDIENCE,
		VITE_CLERK_PUBLISHABLE_KEY:
			clientEnv?.VITE_CLERK_PUBLISHABLE_KEY ??
			clientEnv?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
			processEnv.VITE_CLERK_PUBLISHABLE_KEY ??
			processEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		VITE_CONVEX_URL:
			clientEnv?.VITE_CONVEX_URL ??
			clientEnv?.NEXT_PUBLIC_CONVEX_URL ??
			processEnv.VITE_CONVEX_URL ??
			processEnv.NEXT_PUBLIC_CONVEX_URL,
		VITE_POSTHOG_KEY:
			clientEnv?.VITE_POSTHOG_KEY ??
			clientEnv?.NEXT_PUBLIC_POSTHOG_KEY ??
			processEnv.VITE_POSTHOG_KEY ??
			processEnv.NEXT_PUBLIC_POSTHOG_KEY,
		VITE_POSTHOG_HOST:
			clientEnv?.VITE_POSTHOG_HOST ??
			clientEnv?.NEXT_PUBLIC_POSTHOG_HOST ??
			processEnv.VITE_POSTHOG_HOST ??
			processEnv.NEXT_PUBLIC_POSTHOG_HOST,
		VITE_HOSTING_DOMAIN:
			clientEnv?.VITE_HOSTING_DOMAIN ??
			clientEnv?.NEXT_PUBLIC_HOSTING_DOMAIN ??
			processEnv.VITE_HOSTING_DOMAIN ??
			processEnv.NEXT_PUBLIC_HOSTING_DOMAIN,
		VITE_CF_WORKER:
			clientEnv?.VITE_CF_WORKER ??
			clientEnv?.NEXT_PUBLIC_CF_WORKER ??
			processEnv.VITE_CF_WORKER ??
			processEnv.NEXT_PUBLIC_CF_WORKER,
	},
	skipValidation: !!processEnv.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
