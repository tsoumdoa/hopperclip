import { afterEach, describe, expect, test, vi } from "vitest";
import { handleShareAccess, shareClientKey } from "./share-gateway.server";

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
});

describe("share gateway responses", () => {
	test("untrusted identity prevents any backend request", async () => {
		const resolve = vi.fn();
		const response = await handleShareAccess(
			request({ "x-forwarded-for": "203.0.113.5" }),
			{ env, resolve }
		);
		expect(response.status).toBe(503);
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
});
