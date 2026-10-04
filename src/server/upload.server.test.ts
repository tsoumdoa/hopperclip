import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ConvexError } from "convex/values";
import { getFunctionName } from "convex/server";
import { handleUpload } from "./upload.server";

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	getToken: vi.fn(),
	setAuth: vi.fn(),
	mutation: vi.fn(),
	action: vi.fn(),
	sign: vi.fn(),
	serverEnv: {
		VITE_HOSTING_DOMAIN: "https://hopperclip.example",
		NODE_ENV: "production",
		VITE_CONVEX_URL: "https://example.convex.cloud",
		SERVER_GATEWAY_SECRET: "test-gateway-secret-with-at-least-32-chars" as
			string | undefined,
	},
}));

vi.mock("@clerk/tanstack-react-start/server", () => ({ auth: mocks.auth }));
vi.mock("@/env", () => ({ env: mocks.serverEnv }));
vi.mock("./bucket", () => ({ r2Client: { sign: mocks.sign } }));
vi.mock("./bucket-url", () => ({
	bucketUrl: (user: string, key: string) =>
		`https://bucket.example/${user}/${key}`,
}));
vi.mock("convex/browser", () => ({
	ConvexHttpClient: class {
		setAuth = mocks.setAuth;
		mutation = mocks.mutation;
		action = mocks.action;
	},
}));

const gzip = new Uint8Array(gzipSync("<Archive>example</Archive>"));
function uploadRequest() {
	return new Request("https://hopperclip.example/api/uploads", {
		method: "POST",
		headers: {
			origin: "https://hopperclip.example",
			"sec-fetch-site": "same-origin",
			"content-type": "application/gzip",
		},
		body: gzip,
	});
}

beforeEach(() => {
	vi.resetAllMocks();
	mocks.serverEnv.SERVER_GATEWAY_SECRET =
		"test-gateway-secret-with-at-least-32-chars";
	mocks.auth.mockResolvedValue({
		isAuthenticated: true,
		userId: "user-123",
		getToken: mocks.getToken,
	});
	mocks.getToken.mockResolvedValue("test-convex-jwt");
	mocks.mutation.mockResolvedValue({
		key: "fresh-key",
		clerkUserId: "user-123",
		uploadId: "reservation-123",
		expiresAt: Date.now() + 86_400_000,
	});
	mocks.action.mockResolvedValue({ key: "fresh-key" });
	mocks.sign.mockImplementation(async (url, init) => new Request(url, init));
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => new Response(null, { status: 200 }))
	);
});
afterEach(() => vi.unstubAllGlobals());

test("uses authenticated Convex reservations, raw gzip PUT, then trusted completion", async () => {
	const response = await handleUpload(uploadRequest());
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ key: "fresh-key" });
	expect(mocks.getToken).toHaveBeenCalledWith({ template: "convex" });
	expect(mocks.setAuth).toHaveBeenCalledWith("test-convex-jwt");
	expect(getFunctionName(mocks.mutation.mock.calls[0][0])).toBe(
		"storage:reserveUpload"
	);
	expect(mocks.mutation.mock.calls[0][1]).toEqual({
		key: expect.stringMatching(/^[A-Za-z0-9_-]{21}$/),
		gatewaySecret: mocks.serverEnv.SERVER_GATEWAY_SECRET,
	});
	expect(mocks.sign).toHaveBeenCalledWith(
		"https://bucket.example/user-123/fresh-key",
		{
			method: "PUT",
			body: gzip,
			signal: expect.any(AbortSignal),
			headers: {
				"content-encoding": "gzip",
				"content-type": "application/gzip",
			},
		}
	);
	expect(fetch).toHaveBeenCalledOnce();
	expect(getFunctionName(mocks.action.mock.calls[0][0])).toBe(
		"storageActions:completeUpload"
	);
	expect(mocks.action.mock.calls[0][1]).toEqual({
		uploadId: "reservation-123",
		gatewaySecret: mocks.serverEnv.SERVER_GATEWAY_SECRET,
	});
});

test.each([
	{ isAuthenticated: false, userId: null },
	{ isAuthenticated: true, userId: null },
])("rejects unauthenticated sessions: %j", async (session) => {
	mocks.auth.mockResolvedValue({ ...session, getToken: mocks.getToken });
	expect((await handleUpload(uploadRequest())).status).toBe(401);
	expect(mocks.getToken).not.toHaveBeenCalled();
	expect(mocks.mutation).not.toHaveBeenCalled();
	expect(fetch).not.toHaveBeenCalled();
});

test("rejects a signed-in session without a Convex token", async () => {
	mocks.getToken.mockResolvedValue(null);
	expect((await handleUpload(uploadRequest())).status).toBe(401);
	expect(mocks.mutation).not.toHaveBeenCalled();
});

test("fails closed when the server gateway is not configured", async () => {
	mocks.serverEnv.SERVER_GATEWAY_SECRET = undefined;
	expect((await handleUpload(uploadRequest())).status).toBe(503);
	expect(mocks.mutation).not.toHaveBeenCalled();
	expect(fetch).not.toHaveBeenCalled();
});

test("returns Retry-After for a reservation rate limit before reading the body", async () => {
	mocks.mutation.mockRejectedValue(
		new ConvexError({ code: "RATE_LIMITED", retryAfterMs: 3100 })
	);
	const request = uploadRequest();
	const reader = vi.spyOn(request.body!, "getReader");
	const response = await handleUpload(request);
	expect(response.status).toBe(429);
	expect(response.headers.get("retry-after")).toBe("4");
	expect(reader).not.toHaveBeenCalled();
	expect(mocks.sign).not.toHaveBeenCalled();
	expect(mocks.action).not.toHaveBeenCalled();
});

test("does not finalize an R2 rejection or expose storage response details", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () => new Response("private storage credentials", { status: 403 })
		)
	);
	const response = await handleUpload(uploadRequest());
	expect(response.status).toBe(503);
	expect(await response.text()).not.toContain("credentials");
	expect(mocks.action).not.toHaveBeenCalled();
});
