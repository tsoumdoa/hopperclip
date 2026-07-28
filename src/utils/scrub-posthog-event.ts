import type { CaptureResult } from "posthog-js";

/** Properties that are always full URLs (or URL-like) and should lose search/hash. */
const FULL_URL_PROPERTY_KEYS = new Set([
	"$current_url",
	"document_url",
	"$referrer",
	"url",
	"href",
]);

const TOKEN_KEY_PATTERN = /token|share_?token|shareToken/i;

function scrubUrl(value: string): string {
	try {
		const url = new URL(value, window.location.origin);
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		return value;
	}
}

function scrubPathname(value: string): string {
	const q = value.indexOf("?");
	const h = value.indexOf("#");
	if (q === -1 && h === -1) {
		return value;
	}
	const cut = Math.min(
		q === -1 ? value.length : q,
		h === -1 ? value.length : h
	);
	return value.slice(0, cut);
}

function looksLikeAbsoluteUrl(value: string): boolean {
	return /^https?:\/\//i.test(value) || value.includes("://");
}

function scrubValue(key: string, value: unknown): unknown {
	if (TOKEN_KEY_PATTERN.test(key)) {
		return "[redacted]";
	}

	if (typeof value === "string") {
		if (key === "$pathname") {
			return scrubPathname(value);
		}
		if (FULL_URL_PROPERTY_KEYS.has(key) || looksLikeAbsoluteUrl(value)) {
			return scrubUrl(value);
		}
		// Relative paths or strings with query (e.g. "/share?token=…")
		if (value.startsWith("/") && (value.includes("?") || value.includes("#"))) {
			return scrubPathname(value);
		}
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item, index) => scrubValue(String(index), item));
	}

	if (value !== null && typeof value === "object") {
		return scrubProperties(value as Record<string, unknown>);
	}

	return value;
}

function scrubProperties(
	properties: Record<string, unknown>
): Record<string, unknown> {
	const scrubbed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(properties)) {
		scrubbed[key] = scrubValue(key, value);
	}
	return scrubbed;
}

/** Strip share tokens / URL query+hash from a PostHog capture payload. */
export function scrubPostHogEvent(
	event: CaptureResult | null
): CaptureResult | null {
	if (!event) {
		return event;
	}

	if (event.properties) {
		event.properties = scrubProperties(
			event.properties as Record<string, unknown>
		);
	}
	if (event.$set) {
		event.$set = scrubProperties(event.$set as Record<string, unknown>);
	}
	if (event.$set_once) {
		event.$set_once = scrubProperties(
			event.$set_once as Record<string, unknown>
		);
	}

	return event;
}
