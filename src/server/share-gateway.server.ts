import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { ShareAccessResult } from "@/types/share-access";

type GatewayEnvironment = Record<string, string | undefined>;
type ShareRequest = {
	shareToken: string;
	clientKey: string;
	gatewaySecret: string;
};
type GatewayOptions = {
	env?: GatewayEnvironment;
	resolve?: (
		args: ShareRequest,
		convexUrl: string,
		signal: AbortSignal
	) => Promise<ShareAccessResult>;
};

function canonicalIpIdentity(value: string): string {
	const version = isIP(value);
	if (version === 4) return value;
	if (version !== 6 || value.includes("%"))
		throw new Error("Invalid client IP");
	const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
	const [left, right] = canonical.split("::");
	const before = left ? left.split(":") : [];
	const after = right ? right.split(":") : [];
	const groups =
		right === undefined
			? before
			: [
					...before,
					...Array<string>(8 - before.length - after.length).fill("0"),
					...after,
				];
	const numbers = groups.map((part) => Number.parseInt(part, 16));
	// IPv4-mapped IPv6 addresses must share the same quota as their IPv4 spelling.
	if (
		numbers.slice(0, 5).every((part) => part === 0) &&
		numbers[5] === 0xffff
	) {
		return [
			numbers[6] >> 8,
			numbers[6] & 255,
			numbers[7] >> 8,
			numbers[7] & 255,
		].join(".");
	}
	// Group IPv6 /64s so rotating privacy addresses does not reset the quota.
	return `${numbers
		.slice(0, 4)
		.map((part) => part.toString(16))
		.join(":")}::/64`;
}

export function shareClientKey(
	request: Request,
	env: GatewayEnvironment,
	secret: string
): string {
	let identity: string;
	const header =
		env.VERCEL === "1"
			? "x-vercel-forwarded-for"
			: env.TRUSTED_CLIENT_IP_HEADER;
	if (header) {
		// Vercel overwrites its header. Other proxies require explicit operator trust:
		// they must overwrite this header and block direct access to the origin.
		const supplied = request.headers.get(header);
		if (!supplied) throw new Error("Trusted client IP is unavailable");
		identity = canonicalIpIdentity(supplied.trim());
	} else {
		const hostname = new URL(request.url).hostname;
		if (
			env.NODE_ENV === "production" ||
			!["localhost", "127.0.0.1", "[::1]"].includes(hostname)
		) {
			throw new Error("Trusted client IP is not configured");
		}
		// Local development never trusts supplied forwarded headers.
		identity = "local-development";
	}
	return createHmac("sha256", secret)
		.update(`hopperclip:share-ip:v1:${identity}`)
		.digest("hex");
}

class ShareBodyError extends Error {
	constructor(public readonly status: number) {
		super("Invalid share request body");
	}
}

async function readShareToken(request: Request): Promise<string> {
	const reader = request.body?.getReader();
	if (!reader) throw new ShareBodyError(400);
	const body = new Uint8Array(256);
	let bytes = 0;
	let emptyChunks = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let abort: () => void = () => {};
	const stopped = new Promise<never>((_, reject) => {
		abort = () => reject(new ShareBodyError(408));
		timer = setTimeout(abort, 5_000);
		request.signal.addEventListener("abort", abort, { once: true });
		if (request.signal.aborted) abort();
	});
	try {
		while (true) {
			const { value, done } = await Promise.race([reader.read(), stopped]);
			if (done) break;
			if (value.byteLength === 0) {
				if (++emptyChunks > 16) throw new ShareBodyError(400);
				continue;
			}
			emptyChunks = 0;
			if (bytes + value.byteLength > body.byteLength)
				throw new ShareBodyError(413);
			body.set(value, bytes);
			bytes += value.byteLength;
		}
	} catch (error) {
		// A stalled stream's cancel callback may itself stall; never await it.
		void reader.cancel().catch(() => {});
		throw error;
	} finally {
		clearTimeout(timer);
		request.signal.removeEventListener("abort", abort);
		reader.releaseLock();
	}
	const parsed: unknown = JSON.parse(
		new TextDecoder().decode(body.subarray(0, bytes))
	);
	if (
		!parsed ||
		typeof parsed !== "object" ||
		!("shareToken" in parsed) ||
		typeof parsed.shareToken !== "string" ||
		parsed.shareToken.length > 64
	) {
		throw new Error("Invalid request body");
	}
	return parsed.shareToken;
}

async function resolveViaConvex(
	args: ShareRequest,
	convexUrl: string,
	signal: AbortSignal
) {
	const convex = new ConvexHttpClient(convexUrl, {
		logger: false,
		fetch: (input, init) => fetch(input, { ...init, signal }),
	});
	return convex.action(api.ghPublicAction.generateShareableLink, args);
}

async function resolveWithDeadline(
	request: Request,
	args: ShareRequest,
	convexUrl: string,
	resolve: NonNullable<GatewayOptions["resolve"]>
) {
	const controller = new AbortController();
	const abort = () => controller.abort();
	const timer = setTimeout(abort, 15_000);
	request.signal.addEventListener("abort", abort, { once: true });
	const stopped = new Promise<never>((_, reject) => {
		controller.signal.addEventListener(
			"abort",
			() => reject(new Error("Share request stopped")),
			{ once: true }
		);
	});
	if (request.signal.aborted) abort();
	try {
		return await Promise.race([
			Promise.resolve().then(() => {
				controller.signal.throwIfAborted();
				return resolve(args, convexUrl, controller.signal);
			}),
			stopped,
		]);
	} finally {
		clearTimeout(timer);
		request.signal.removeEventListener("abort", abort);
	}
}

export async function handleShareAccess(
	request: Request,
	options: GatewayOptions = {}
): Promise<Response> {
	const env = options.env ?? process.env;
	const headers = {
		"Cache-Control": "no-store",
		"Referrer-Policy": "no-referrer",
	};
	if (request.method !== "POST") {
		return Response.json(
			{ status: "invalid_request" },
			{ status: 405, headers: { ...headers, Allow: "POST" } }
		);
	}
	const origin = request.headers.get("Origin");
	if (
		request.headers.get("Sec-Fetch-Site") === "cross-site" ||
		(origin && origin !== new URL(request.url).origin)
	) {
		return Response.json(
			{ status: "invalid_request" },
			{ status: 403, headers }
		);
	}
	if (
		request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !==
		"application/json"
	) {
		return Response.json(
			{ status: "invalid_request" },
			{ status: 415, headers }
		);
	}
	let shareToken: string;
	try {
		shareToken = await readShareToken(request);
	} catch (error) {
		return Response.json(
			{ status: "invalid_request" },
			{ status: error instanceof ShareBodyError ? error.status : 400, headers }
		);
	}
	try {
		const gatewaySecret = env.SERVER_GATEWAY_SECRET;
		const convexUrl =
			env.VITE_CONVEX_URL ??
			env.NEXT_PUBLIC_CONVEX_URL ??
			(options.env
				? undefined
				: (import.meta.env.VITE_CONVEX_URL ??
					import.meta.env.NEXT_PUBLIC_CONVEX_URL));
		if (!gatewaySecret || gatewaySecret.length < 32 || !convexUrl) {
			throw new Error("Share gateway is not configured");
		}
		const clientKey = shareClientKey(request, env, gatewaySecret);
		const result = await resolveWithDeadline(
			request,
			{ shareToken, clientKey, gatewaySecret },
			convexUrl,
			options.resolve ?? resolveViaConvex
		);
		if (result.status === "rate_limited") {
			return Response.json(result, {
				status: 429,
				headers: {
					...headers,
					"Retry-After": String(result.retryAfterSeconds),
				},
			});
		}
		return Response.json(result, {
			status:
				result.status === "ok"
					? 200
					: result.status === "not_found"
						? 404
						: 503,
			headers,
		});
	} catch {
		// Do not expose backend errors, tokens, IPs, or the gateway credential in logs.
		return Response.json({ status: "unavailable" }, { status: 503, headers });
	}
}
