import { afterEach, describe, expect, test, vi } from "vitest";
import {
	handleShareAccess,
	resolveShareConvexUrl,
	shareClientKey,
} from "./share-gateway.server";

const secret = "local-test-server-gateway-secret-12345678";
const env = {
	NODE_ENV: "production",
	VERCEL: "1",
	SERVER_GATEWAY_SECRET: secret,
	VITE_CONVEX_URL: "https://example.convex.cloud",
};
function request(
	headers: Record<string, string | undefined> = {},
	body = JSON.stringify({ shareToken: "a".repeat(15) }),
	url = "https://hopperclip.test/api/share"
) {
	const supplied = new Headers({ "Content-Type": "application/json" });
	for (const [name, value] of Object.entries(headers)) {
		if (value !== undefined) supplied.set(name, value);
	}
	return new Request(url, {
		method: "POST",
		headers: supplied,
		body,
	});
}

afterEach(() => vi.useRealTimers());

describe("share gateway deployment URL", () => {
	test("uses the build deployment even when hosting has stale URL variables", () => {
		expect(
			resolveShareConvexUrl(
				{
					VITE_CONVEX_URL: "https://stale-runtime.convex.cloud",
					NEXT_PUBLIC_CONVEX_URL: "https://legacy-runtime.convex.cloud",
				},
				{
					VITE_CONVEX_URL: "https://selected-build.convex.cloud",
					NEXT_PUBLIC_CONVEX_URL: "https://legacy-build.convex.cloud",
				}
			)
		).toBe("https://selected-build.convex.cloud");
	});

	test("keeps the same legacy build and runtime fallbacks as the app", () => {
		const runtime = {
			VITE_CONVEX_URL: "https://runtime.convex.cloud",
			NEXT_PUBLIC_CONVEX_URL: "https://legacy-runtime.convex.cloud",
		};
		expect(
			resolveShareConvexUrl(runtime, {
				NEXT_PUBLIC_CONVEX_URL: "https://legacy-build.convex.cloud",
			})
		).toBe("https://legacy-build.convex.cloud");
		expect(resolveShareConvexUrl(runtime)).toBe(runtime.VITE_CONVEX_URL);
		expect(
			resolveShareConvexUrl({
				NEXT_PUBLIC_CONVEX_URL: runtime.NEXT_PUBLIC_CONVEX_URL,
			})
		).toBe(runtime.NEXT_PUBLIC_CONVEX_URL);
		expect(resolveShareConvexUrl({})).toBeUndefined();
	});
});

describe("share gateway client identity", () => {
	test("uses the Vercel-controlled header and ignores spoofed forwarded headers", () => {
		const trusted = { "x-vercel-forwarded-for": "203.0.113.5" };
		const clean = shareClientKey(request(trusted), env, secret);
		const spoofed = shareClientKey(
			request({
				...trusted,
				"x-forwarded-for": "1.2.3.4",
				"x-real-ip": "5.6.7.8",
				"cf-connecting-ip": "9.10.11.12",
			}),
			env,
			secret
		);
		expect(clean).toBe(spoofed);
		expect(clean).toMatch(/^[a-f0-9]{64}$/);
		expect(clean).not.toContain("203.0.113.5");
		expect(shareClientKey(request(trusted), env, `${secret}-rotated`)).not.toBe(
			clean
		);
	});
	test.each([
		{},
		{ "x-forwarded-for": "203.0.113.5" },
		{ "x-vercel-forwarded-for": "203.0.113.5, 1.2.3.4" },
		{ "x-vercel-forwarded-for": "invalid" },
	])("fails closed for missing or ambiguous trusted IP: %j", (headers) => {
		expect(() => shareClientKey(request(headers), env, secret)).toThrow();
	});
	test("a Vercel-looking header on another host never establishes trust", () => {
		expect(() =>
			shareClientKey(
				request({ "x-vercel-forwarded-for": "203.0.113.5" }),
				{ NODE_ENV: "production" },
				secret
			)
		).toThrow("not configured");
	});
	test("supports only an explicitly configured trusted proxy header off Vercel", () => {
		const proxyEnv = {
			NODE_ENV: "production",
			TRUSTED_CLIENT_IP_HEADER: "x-trusted-client-ip",
		};
		expect(
			shareClientKey(
				request({ "x-trusted-client-ip": "203.0.113.5" }),
				proxyEnv,
				secret
			)
		).toBe(
			shareClientKey(
				request({ "x-vercel-forwarded-for": "203.0.113.5" }),
				env,
				secret
			)
		);
	});
	test("normalizes IPv6 and combines privacy addresses in one /64", () => {
		const key = (ip: string) =>
			shareClientKey(request({ "x-vercel-forwarded-for": ip }), env, secret);
		expect(key("2001:db8:1234:5678::1")).toBe(
			key("2001:0db8:1234:5678:0000:0000:0000:0001")
		);
		expect(key("2001:db8:1234:5678::1")).toBe(
			key("2001:db8:1234:5678:1111:2222:3333:4444")
		);
		expect(key("2001:db8:1234:5678::1")).not.toBe(key("2001:db8:1234:5679::1"));
		expect(key("::ffff:203.0.113.5")).toBe(key("203.0.113.5"));
	});
	test("dev loopback ignores forwarded headers and never extends to production or external hosts", () => {
		const local = request({}, undefined, "http://localhost:3000/api/share");
		const spoofed = request(
			{ "x-forwarded-for": "1.2.3.4" },
			undefined,
			"http://localhost:3000/api/share"
		);
		expect(shareClientKey(local, { NODE_ENV: "development" }, secret)).toBe(
			shareClientKey(spoofed, { NODE_ENV: "development" }, secret)
		);
		expect(() =>
			shareClientKey(local, { NODE_ENV: "production" }, secret)
		).toThrow();
		expect(() =>
			shareClientKey(request(), { NODE_ENV: "development" }, secret)
		).toThrow();
	});
});

describe("share gateway responses", () => {
	test("returns a noncached 429 with Retry-After", async () => {
		const resolve = vi
			.fn()
			.mockResolvedValue({ status: "rate_limited", retryAfterSeconds: 2 });
		const response = await handleShareAccess(
			request({ "x-vercel-forwarded-for": "203.0.113.5" }),
			{ env, resolve }
		);
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("2");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.text()).not.toContain(secret);
		expect(resolve.mock.calls[0][0]).toMatchObject({
			gatewaySecret: secret,
			shareToken: "a".repeat(15),
			clientKey: expect.stringMatching(/^[a-f0-9]{64}$/),
		});
	});
	test("configuration errors prevent any backend request and produce a generic 503", async () => {
		const resolve = vi.fn();
		const response = await handleShareAccess(request(), { env: {}, resolve });
		expect(response.status).toBe(503);
		expect(resolve).not.toHaveBeenCalled();
		expect(await response.json()).toEqual({ status: "unavailable" });
	});
	test("untrusted identity prevents any backend request", async () => {
		const resolve = vi.fn();
		const response = await handleShareAccess(
			request({ "x-forwarded-for": "203.0.113.5" }),
			{ env, resolve }
		);
		expect(response.status).toBe(503);
		expect(resolve).not.toHaveBeenCalled();
	});
	test.each([
		["{", 400],
		[JSON.stringify({ shareToken: "a".repeat(1000) }), 413],
	] as const)(
		"rejects malformed or oversized input before backend work",
		async (body, status) => {
			const resolve = vi.fn();
			expect(
				(await handleShareAccess(request({}, body), { env, resolve })).status
			).toBe(status);
			expect(resolve).not.toHaveBeenCalled();
		}
	);

	test.each([
		{ "Sec-Fetch-Site": "cross-site" },
		{ Origin: "https://attacker.test" },
		{ Origin: "null" },
	])(
		"rejects cross-site browser requests before consuming another visitor's quota",
		async (headers) => {
			const resolve = vi.fn();
			expect(
				(await handleShareAccess(request(headers), { env, resolve })).status
			).toBe(403);
			expect(resolve).not.toHaveBeenCalled();
		}
	);

	test("requires POST JSON and does not process simple form submissions", async () => {
		const resolve = vi.fn();
		expect(
			(
				await handleShareAccess(
					new Request("https://hopperclip.test/api/share"),
					{ env, resolve }
				)
			).status
		).toBe(405);
		expect(
			(
				await handleShareAccess(request({ "Content-Type": "text/plain" }), {
					env,
					resolve,
				})
			).status
		).toBe(415);
		expect(resolve).not.toHaveBeenCalled();
	});

	test("bounds empty chunks without growing memory or querying the backend", async () => {
		const resolve = vi.fn();
		let chunks = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				chunks++;
				controller.enqueue(new Uint8Array());
			},
		});
		const req = new Request("https://hopperclip.test/api/share", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
			duplex: "half",
		} as RequestInit);
		expect((await handleShareAccess(req, { env, resolve })).status).toBe(400);
		expect(chunks).toBeLessThanOrEqual(18);
		expect(resolve).not.toHaveBeenCalled();
	});

	test("times out stalled bodies even when stream cancellation never settles", async () => {
		vi.useFakeTimers();
		const resolve = vi.fn();
		const cancel = vi.fn(() => new Promise<void>(() => {}));
		const body = new ReadableStream<Uint8Array>({ cancel });
		const req = new Request("https://hopperclip.test/api/share", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
			duplex: "half",
		} as RequestInit);
		const pending = handleShareAccess(req, { env, resolve });
		await vi.advanceTimersByTimeAsync(5_000);
		expect((await pending).status).toBe(408);
		expect(cancel).toHaveBeenCalledOnce();
		expect(resolve).not.toHaveBeenCalled();
	});

	test("stops reading on client abort without querying the backend", async () => {
		const resolve = vi.fn();
		const controller = new AbortController();
		const body = new ReadableStream<Uint8Array>();
		const req = new Request("https://hopperclip.test/api/share", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
			signal: controller.signal,
			duplex: "half",
		} as RequestInit);
		const pending = handleShareAccess(req, { env, resolve });
		controller.abort();
		expect((await pending).status).toBe(408);
		expect(resolve).not.toHaveBeenCalled();
	});

	test("times out a stalled backend after body parsing and aborts its network signal", async () => {
		vi.useFakeTimers();
		let backendSignal: AbortSignal | undefined;
		const resolve = vi.fn((_args, _url, signal: AbortSignal) => {
			backendSignal = signal;
			return new Promise<never>(() => {});
		});
		const pending = handleShareAccess(
			request({ "x-vercel-forwarded-for": "203.0.113.5" }),
			{ env, resolve }
		);
		await vi.advanceTimersByTimeAsync(0);
		expect(resolve).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(15_000);
		expect((await pending).status).toBe(503);
		expect(backendSignal?.aborted).toBe(true);
	});

	test("client cancellation after a valid body stops the backend request", async () => {
		const controller = new AbortController();
		const req = new Request(
			request({ "x-vercel-forwarded-for": "203.0.113.5" }),
			{ signal: controller.signal }
		);
		let backendSignal: AbortSignal | undefined;
		const resolve = vi.fn((_args, _url, signal: AbortSignal) => {
			backendSignal = signal;
			controller.abort();
			return new Promise<never>(() => {});
		});
		expect((await handleShareAccess(req, { env, resolve })).status).toBe(503);
		expect(backendSignal?.aborted).toBe(true);
	});
	test("maps expired/missing shares to 404 and hides backend failures", async () => {
		const headers = { "x-vercel-forwarded-for": "203.0.113.5" };
		expect(
			(
				await handleShareAccess(request(headers), {
					env,
					resolve: async () => ({ status: "not_found" }),
				})
			).status
		).toBe(404);
		const unavailable = await handleShareAccess(request(headers), {
			env,
			resolve: async () => {
				throw new Error("Secret backend detail");
			},
		});
		expect(unavailable.status).toBe(503);
		expect(await unavailable.text()).not.toContain("Secret backend detail");
	});
});
