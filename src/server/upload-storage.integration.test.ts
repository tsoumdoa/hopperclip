import { gzipSync } from "node:zlib";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "@convex/_generated/api";
import schema from "@convex/schema";
import { storageRequest } from "@convex/storageR2";
import { UPLOAD_EXPIRY_MS } from "@convex/storageLifecycle";
import { UPLOAD_CAPACITY } from "@convex/shareAccess";
import { handleUpload } from "./upload.server";

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	mutation: vi.fn(),
	action: vi.fn(),
	sign: vi.fn(),
	gatewaySecret: "integration-test-gateway-secret-at-least-32-characters",
}));
vi.mock("@clerk/tanstack-react-start/server", () => ({ auth: mocks.auth }));
vi.mock("@/env", () => ({
	env: {
		VITE_HOSTING_DOMAIN: "https://hopperclip.example",
		NODE_ENV: "production",
		VITE_CONVEX_URL: "https://example.convex.cloud",
		SERVER_GATEWAY_SECRET: mocks.gatewaySecret,
	},
}));
vi.mock("./bucket", () => ({ r2Client: { sign: mocks.sign } }));
vi.mock("convex/browser", () => ({
	ConvexHttpClient: class {
		setAuth() {}
		mutation = mocks.mutation;
		action = mocks.action;
	},
}));
vi.mock("@convex/storageR2", () => ({ storageRequest: vi.fn() }));

const modules = import.meta.glob([
	"../../convex/**/*.ts",
	"../../convex/_generated/*.js",
	"!../../convex/**/*.test.ts",
]);
const metadata = { name: "Example card", description: "", tags: [] };
const ownerId = "user_alice";
const gzip = new Uint8Array(gzipSync("<Archive>integration</Archive>"));
let backend: TestConvex<typeof schema>;
let owner: ReturnType<TestConvex<typeof schema>["withIdentity"]>;
let objects: Map<string, { bytes: ArrayBuffer; headers: Headers }>;

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

async function successfulUpload() {
	const response = await handleUpload(uploadRequest());
	expect(response.status).toBe(200);
	return (await response.json()).key as string;
}

async function ledger(key: string) {
	return backend.run((ctx) =>
		ctx.db
			.query("storageObjects")
			.withIndex("by_user_key", (q) =>
				q.eq("clerkUserId", ownerId).eq("key", key)
			)
			.unique()
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-10-04T00:00:00Z"));
	vi.resetAllMocks();
	vi.stubEnv("SERVER_GATEWAY_SECRET", mocks.gatewaySecret);
	// The real web URL helper must agree with the Convex object namespace,
	// including the common trailing-slash configuration.
	vi.stubEnv("R2_URL", "https://bucket.example/bucket/");
	backend = convexTest(schema, modules);
	owner = backend.withIdentity({ id: ownerId });
	objects = new Map();
	mocks.auth.mockResolvedValue({
		isAuthenticated: true,
		userId: ownerId,
		getToken: async () => "test-convex-jwt",
	});
	// Only the transport is mocked: use the real reservation, quota, ownership,
	// HEAD verification, finalization and card mutation implementations.
	mocks.mutation.mockImplementation((reference, args) =>
		owner.mutation(reference, args)
	);
	mocks.action.mockImplementation((reference, args) =>
		owner.action(reference, args)
	);
	mocks.sign.mockImplementation(async (url, init) => new Request(url, init));
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: Request) => {
			expect(input.method).toBe("PUT");
			const path = new URL(input.url).pathname;
			expect(path).toMatch(/^\/bucket\/user_alice\/[^/]+$/);
			objects.set(path.slice("/bucket/".length), {
				bytes: await input.arrayBuffer(),
				headers: input.headers,
			});
			return new Response(null, { status: 200 });
		})
	);
	vi.mocked(storageRequest).mockImplementation(async (method, userId, key) => {
		const name = `${userId}/${key}`;
		if (method === "DELETE") {
			objects.delete(name);
			return new Response(null, { status: 204 });
		}
		const object = objects.get(name);
		if (!object) return new Response(null, { status: 404 });
		return new Response(null, {
			status: 200,
			headers: {
				"content-length": String(object.bytes.byteLength),
				"content-type": object.headers.get("content-type")!,
				"content-encoding": object.headers.get("content-encoding")!,
			},
		});
	});
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

test("binary POST, R2 HEAD and card attachment share the exact owner, key and reservation", async () => {
	const key = await successfulUpload();
	expect(storageRequest).toHaveBeenCalledWith("HEAD", ownerId, key);
	expect(await ledger(key)).toMatchObject({
		state: "uploaded",
		clerkUserId: ownerId,
	});
	expect(objects.get(`${ownerId}/${key}`)?.bytes).toEqual(gzip.buffer);
	await owner.mutation(api.ghCard.addPost, { ...metadata, uid: key });
	expect(await ledger(key)).toMatchObject({ state: "attached" });
	const post = await backend.run((ctx) => ctx.db.query("post").unique());
	expect(post).toMatchObject({ bucketUrl: key, clerkUserId: ownerId });
	await owner.mutation(api.ghCard.deletePost, { id: post!._id });
	await backend.finishAllScheduledFunctions(vi.runAllTimers);
	expect(await ledger(key)).toMatchObject({ state: "deleted" });
	expect(objects.has(`${ownerId}/${key}`)).toBe(false);
});

test("a real exhausted reservation quota becomes HTTP 429 with Retry-After before reading", async () => {
	for (let i = 0; i < UPLOAD_CAPACITY; i++) {
		await owner.mutation(api.storage.reserveUpload, {
			key: `reserved-${i}`,
			gatewaySecret: mocks.gatewaySecret,
		});
	}
	const request = uploadRequest();
	const read = vi.spyOn(request.body!, "getReader");
	const response = await handleUpload(request);
	expect(response.status).toBe(429);
	expect(response.headers.get("retry-after")).toBe("3");
	expect(read).not.toHaveBeenCalled();
	expect(mocks.sign).not.toHaveBeenCalled();
	expect(objects.size).toBe(0);
	expect(
		await backend.run((ctx) => ctx.db.query("storageObjects").collect())
	).toHaveLength(UPLOAD_CAPACITY);
});

test("mismatched Clerk and Convex owner claims cannot write outside the reservation ledger", async () => {
	owner = backend.withIdentity({ id: "user_bob" });
	const request = uploadRequest();
	const read = vi.spyOn(request.body!, "getReader");
	expect((await handleUpload(request)).status).toBe(503);
	expect(read).not.toHaveBeenCalled();
	expect(mocks.sign).not.toHaveBeenCalled();
	expect(objects.size).toBe(0);
});

test("an upload whose HEAD verification fails is removed by durable expiration cleanup", async () => {
	vi.mocked(storageRequest).mockResolvedValueOnce(
		new Response(null, { status: 404 })
	);
	expect((await handleUpload(uploadRequest())).status).toBe(503);
	const object = await backend.run((ctx) =>
		ctx.db.query("storageObjects").unique()
	);
	expect(object).toMatchObject({ state: "reserved" });
	expect(objects.size).toBe(1);
	vi.setSystemTime(Date.now() + UPLOAD_EXPIRY_MS + 1);
	await backend.mutation(internal.storage.sweep, {});
	await backend.finishAllScheduledFunctions(vi.runAllTimers);
	expect(objects.size).toBe(0);
	expect(await ledger(object!.key)).toMatchObject({ state: "deleted" });
});

test("a failed save leaves the old card intact and reclaims the unattached replacement without browser help", async () => {
	const oldKey = await successfulUpload();
	await owner.mutation(api.ghCard.addPost, { ...metadata, uid: oldKey });
	const post = await backend.run((ctx) => ctx.db.query("post").unique());
	const replacementKey = await successfulUpload();
	await expect(
		owner.mutation(api.ghCard.updatePost, {
			id: post!._id,
			uid: replacementKey,
			name: "", // A failed metadata validation must not consume the new receipt.
		})
	).rejects.toThrow();
	expect(await ledger(oldKey)).toMatchObject({ state: "attached" });
	expect(await ledger(replacementKey)).toMatchObject({ state: "uploaded" });
	vi.setSystemTime(Date.now() + UPLOAD_EXPIRY_MS + 1);
	await backend.mutation(internal.storage.sweep, {});
	await backend.finishAllScheduledFunctions(vi.runAllTimers);
	expect(objects.has(`${ownerId}/${oldKey}`)).toBe(true);
	expect(objects.has(`${ownerId}/${replacementKey}`)).toBe(false);
	expect(await backend.run((ctx) => ctx.db.get(post!._id))).toMatchObject({
		bucketUrl: oldKey,
	});
});
