import { AuthConfig } from "convex/server";

const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!clerkJwtIssuerDomain) {
	throw new Error(
		"CLERK_JWT_ISSUER_DOMAIN is not set. Configure it in the Convex dashboard."
	);
}

export default {
	providers: [
		{
			domain: clerkJwtIssuerDomain,
			applicationID: "convex",
		},
	],
} satisfies AuthConfig;
