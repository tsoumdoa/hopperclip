export const STATIC_PRERENDER_PATHS = [
	"/",
	"/privacy",
	"/terms-of-service",
	"/duckerweb",
] as const;

export type StaticPrerenderPath = (typeof STATIC_PRERENDER_PATHS)[number];

export function isStaticPrerenderPath(path: string): path is StaticPrerenderPath {
	return (STATIC_PRERENDER_PATHS as readonly string[]).includes(path);
}
