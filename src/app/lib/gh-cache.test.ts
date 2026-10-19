import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	GH_CACHE_DATABASE,
	GH_CACHE_MAX_AGE,
	GhPayloadCache,
} from "./gh-payload-cache";
import { GhXmlClient, type GhDownload } from "./gh-xml-client";
import { compress } from "../utils/gzip";

const scope = JSON.stringify(["deployment", "alice"]);
const target = { postId: "card", bucketKey: "file-v1" };
const xml = "<Archive>test snippet</Archive>";
const bytes = () => new TextEncoder().encode(xml).buffer;

function fixture(budget = 25 * 1024 * 1024) {
	const factory = new IDBFactory();
	let now = Date.now();
	const makeCache = () =>
		new GhPayloadCache(
			() => factory,
			budget,
			() => now
		);
	const cache = makeCache();
	return {
		factory,
		cache,
		makeCache,
		advance: (ms: number) => {
			now += ms;
		},
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

async function lease(cache: GhPayloadCache) {
	const value = await cache.lease(scope);
	if (!value) throw new Error("Missing test cache lease");
	return value;
}

function reader(cache: GhPayloadCache) {
	const descriptor: GhDownload = {
		...target,
		userId: "alice",
		downloadUrl: "https://storage.invalid/file",
	};
	const resolve = vi.fn(async () => descriptor as GhDownload | null);
	const download = vi.fn<typeof fetch>(async () => new Response(compress(xml)));
	const client = new GhXmlClient("deployment", resolve, cache, download);
	client.setUser("alice");
	return { client, resolve, download, descriptor };
}

async function waitForStored(cache: GhPayloadCache) {
	await vi.waitFor(async () => {
		expect(
			await cache.read(await lease(cache), target.postId, target.bucketKey)
		).not.toBeNull();
	});
}

beforeEach(() => vi.stubGlobal("IDBKeyRange", IDBKeyRange));
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("bounded persistent snippet cache", () => {
	test("keeps more than ten small files and reopens them from a new connection", async () => {
		const { cache, makeCache } = fixture(64 * 1024);
		await cache.activate(scope);
		const token = await lease(cache);
		for (let i = 0; i < 30; i++)
			expect(
				await cache.write(token, `card-${i}`, "key", bytes(), "hash")
			).toBe(true);
		cache.close();
		const reopened = makeCache();
		await reopened.activate(scope);
		for (let i = 0; i < 30; i++)
			expect(
				await reopened.read(await lease(reopened), `card-${i}`, "key")
			).not.toBeNull();
		reopened.close();
	});

	test("evicts by bytes and recency, and an oversized file does not empty the cache", async () => {
		const { cache, advance } = fixture(5500);
		await cache.activate(scope);
		const token = await lease(cache);
		const payload = new ArrayBuffer(1000);
		await cache.write(token, "a", "key", payload, "hash");
		advance(1);
		await cache.write(token, "b", "key", payload, "hash");
		advance(1);
		await cache.read(token, "a", "key");
		advance(1);
		await cache.write(token, "c", "key", payload, "hash");
		expect(await cache.read(token, "a", "key")).not.toBeNull();
		expect(await cache.read(token, "b", "key")).toBeNull();
		expect(await cache.read(token, "c", "key")).not.toBeNull();
		expect(
			await cache.write(token, "huge", "key", new ArrayBuffer(6000), "hash")
		).toBe(false);
		expect(await cache.read(token, "a", "key")).not.toBeNull();
		cache.close();
	});

	test("reads and duplicate writes cannot extend the seven-day expiry", async () => {
		const { cache, advance } = fixture();
		await cache.activate(scope);
		const token = await lease(cache);
		await cache.write(token, "card", "key", bytes(), "hash");
		advance(GH_CACHE_MAX_AGE - 1);
		expect(await cache.read(token, "card", "key")).not.toBeNull();
		await cache.write(token, "card", "key", bytes(), "hash");
		advance(1);
		expect(await cache.read(token, "card", "key")).toBeNull();
		cache.close();
	});

	test("expiry during a duplicate write frees space for the next file", async () => {
		const { cache, advance } = fixture(5500);
		await cache.activate(scope);
		const token = await lease(cache);
		const payload = new ArrayBuffer(1000);
		await cache.write(token, "a", "key", payload, "hash");
		advance(1);
		await cache.write(token, "b", "key", payload, "hash");
		advance(GH_CACHE_MAX_AGE - 1);
		await cache.write(token, "b", "key", payload, "hash");
		await cache.write(token, "c", "key", payload, "hash");
		expect(await cache.read(token, "a", "key")).toBeNull();
		expect(await cache.read(token, "b", "key")).not.toBeNull();
		expect(await cache.read(token, "c", "key")).not.toBeNull();
		cache.close();
	});

	test("transactions fence late writes across tabs, clears, and account switches", async () => {
		const { cache, makeCache } = fixture();
		const otherTab = makeCache();
		await cache.activate(scope);
		const stale = await lease(cache);
		await cache.write(stale, "card", "old", bytes(), "hash");
		await otherTab.invalidate(scope);
		expect(await cache.write(stale, "card", "old", bytes(), "hash")).toBe(
			false
		);
		expect(await cache.read(await lease(cache), "card", "old")).toBeNull();
		const beforeSwitch = await lease(cache);
		await otherTab.activate("bob");
		expect(await cache.lease(scope)).toBeNull();
		expect(
			await cache.write(beforeSwitch, "card", "old", bytes(), "hash")
		).toBe(false);
		await otherTab.activate(scope);
		expect(
			await cache.write(beforeSwitch, "card", "old", bytes(), "hash")
		).toBe(false);
		cache.close();
		otherTab.close();
	});

	test("concurrent writes obey the shared byte budget and replacement removes the old key", async () => {
		const { cache, makeCache } = fixture(5500);
		await cache.activate(scope);
		const token = await lease(cache);
		const otherTab = makeCache();
		await Promise.all(
			Array.from({ length: 12 }, (_, i) =>
				(i % 2 ? cache : otherTab).write(
					token,
					`card-${i}`,
					"key",
					new ArrayBuffer(1000),
					"hash"
				)
			)
		);
		const kept = await Promise.all(
			Array.from({ length: 12 }, (_, i) =>
				cache.read(token, `card-${i}`, "key")
			)
		);
		expect(kept.filter(Boolean)).toHaveLength(2);
		await cache.write(token, "replacement", "old", bytes(), "hash");
		await otherTab.write(token, "replacement", "new", bytes(), "hash");
		expect(await cache.read(token, "replacement", "old")).toBeNull();
		expect(await cache.read(token, "replacement", "new")).not.toBeNull();
		cache.close();
		otherTab.close();
	});
});

describe("verified cache reads", () => {
	test("the default browser transport preserves the fetch receiver on a cold read", async () => {
		const { cache } = fixture();
		const nativeFetch = vi.fn<typeof fetch>(async function (this: unknown) {
			if (this !== globalThis)
				throw new TypeError(
					"'fetch' called on an object that does not implement interface Window."
				);
			return new Response(compress(xml));
		});
		vi.stubGlobal("fetch", nativeFetch);
		const client = new GhXmlClient(
			"deployment",
			async () => ({
				...target,
				userId: "alice",
				downloadUrl: "https://storage.invalid/file",
			}),
			cache
		);
		client.setUser("alice");
		expect(
			await Promise.all([client.read(target), client.read(target)])
		).toEqual([xml, xml]);
		await waitForStored(cache);
		expect(await client.read(target)).toBe(xml);
		expect(nativeFetch).toHaveBeenCalledTimes(1);
		cache.close();
	});

	test("Copy and preview share a download; a reload still verifies online before reusing bytes", async () => {
		const { cache, makeCache } = fixture();
		const { client, resolve, download } = reader(cache);
		expect(
			await Promise.all([client.read(target), client.read(target)])
		).toEqual([xml, xml]);
		expect(download).toHaveBeenCalledTimes(1);
		expect(resolve).toHaveBeenCalledTimes(1);
		await waitForStored(cache);
		cache.close();
		const reloadedCache = makeCache();
		const reloaded = reader(reloadedCache);
		expect(await reloaded.client.read(target)).toBe(xml);
		expect(reloaded.resolve).toHaveBeenCalledTimes(1);
		expect(reloaded.download).not.toHaveBeenCalled();
		reloaded.resolve.mockRejectedValueOnce(new Error("Not authenticated"));
		await expect(reloaded.client.read(target)).rejects.toThrow(
			"Not authenticated"
		);
		expect(reloaded.download).not.toHaveBeenCalled();
		reloadedCache.close();
	});

	test("replacement and deletion cannot serve the previous cached file", async () => {
		const { cache } = fixture();
		const { client, resolve, descriptor, download } = reader(cache);
		await client.read(target);
		await waitForStored(cache);
		resolve.mockResolvedValueOnce({ ...descriptor, bucketKey: "file-v2" });
		await expect(client.read(target)).rejects.toThrow("changed");
		resolve.mockResolvedValueOnce(null);
		await expect(client.read(target)).rejects.toThrow("no longer available");
		expect(download).toHaveBeenCalledTimes(1);
		await vi.waitFor(async () =>
			expect(
				await cache.read(await lease(cache), target.postId, target.bucketKey)
			).toBeNull()
		);
		cache.close();
	});

	test.each(["clear", "replace", "signout"])(
		"a late download cannot finish after %s",
		async (operation) => {
			const { cache } = fixture();
			const { client, download } = reader(cache);
			const pending = deferred<Response>();
			download.mockImplementationOnce(() => pending.promise);
			const result = client.read(target);
			const rejected = expect(result).rejects.toMatchObject({
				name: "AbortError",
			});
			await vi.waitFor(() => expect(download).toHaveBeenCalledTimes(1));
			if (operation === "clear") await client.clear();
			if (operation === "replace") client.invalidate(target.postId);
			if (operation === "signout") client.setUser(null);
			pending.resolve(new Response(bytes()));
			await rejected;
			if (operation !== "signout")
				expect(
					await cache.read(await lease(cache), target.postId, target.bucketKey)
				).toBeNull();
			cache.close();
		}
	);

	test("a delayed cross-tab signout cancels pending work without overriding reauthentication", async () => {
		let deliver!: (data: unknown) => void;
		vi.stubGlobal(
			"BroadcastChannel",
			class {
				onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
				constructor() {
					deliver = (data) =>
						this.onmessage?.({ data } as MessageEvent<unknown>);
				}
				postMessage() {}
				close() {}
			}
		);
		const { cache } = fixture();
		const { client, resolve, download } = reader(cache);
		const disconnect = client.connect();
		client.setUser(null);
		client.setUser("alice");
		const pending = deferred<Response>();
		download.mockImplementationOnce(() => pending.promise);
		const cancelled = expect(
			client.read(target, "alice")
		).rejects.toMatchObject({ name: "AbortError" });
		await vi.waitFor(() => expect(download).toHaveBeenCalledTimes(1));
		deliver({ type: "signout", scope });
		pending.resolve(new Response(bytes()));
		await cancelled;
		expect(await client.read(target, "alice")).toBe(xml);
		expect(resolve).toHaveBeenCalledTimes(2);
		await waitForStored(cache);
		resolve.mockRejectedValueOnce(new Error("Not authenticated"));
		await expect(client.read(target, "alice")).rejects.toThrow(
			"Not authenticated"
		);
		disconnect();
	});

	test("an account switch during authorization cannot release the previous user's data", async () => {
		const { cache } = fixture();
		const { client, resolve, descriptor, download } = reader(cache);
		const pending = deferred<GhDownload | null>();
		resolve.mockImplementationOnce(() => pending.promise);
		const result = client.read(target);
		const rejected = expect(result).rejects.toMatchObject({
			name: "AbortError",
		});
		client.setUser("bob");
		pending.resolve(descriptor);
		await rejected;
		expect(download).not.toHaveBeenCalled();
		await expect(client.read(target)).rejects.toThrow("no longer available");
		cache.close();
	});

	test("unavailable and stalled storage fall back to the authorized download", async () => {
		const denied = new GhPayloadCache(() => {
			throw new DOMException("Denied", "SecurityError");
		});
		const first = reader(denied);
		expect(await first.client.read(target)).toBe(xml);
		const { cache } = fixture();
		vi.spyOn(cache, "read").mockImplementationOnce(() => new Promise(() => {}));
		const second = reader(cache);
		expect(await second.client.read(target)).toBe(xml);
		expect(second.download).toHaveBeenCalledTimes(1);
		cache.close();
	});

	test("corruption recovery cannot repopulate a cache cleared by another tab", async () => {
		const { cache, makeCache } = fixture();
		await cache.activate(scope);
		await cache.write(
			await lease(cache),
			target.postId,
			target.bucketKey,
			bytes(),
			"invalid-checksum"
		);
		const { client } = reader(cache);
		const otherCache = makeCache();
		const other = reader(otherCache);
		// Messaging is unavailable. The durable fence must be sufficient on its own.
		const pendingHash = deferred<ArrayBuffer>();
		const hashing = vi
			.spyOn(crypto.subtle, "digest")
			.mockResolvedValue(new ArrayBuffer(32))
			.mockImplementationOnce(() => pendingHash.promise);
		const result = client.read(target);
		await vi.waitFor(() => expect(hashing).toHaveBeenCalledTimes(1));
		await other.client.clear();
		pendingHash.resolve(new ArrayBuffer(32));
		expect(await result).toBe(xml);
		expect(
			await cache.read(await lease(cache), target.postId, target.bucketKey)
		).toBeNull();
		cache.close();
		otherCache.close();
	});

	test("a corrupt persisted payload is evicted and downloaded once", async () => {
		const { cache, factory } = fixture();
		const { client, download } = reader(cache);
		await client.read(target);
		await waitForStored(cache);
		await new Promise<void>((resolve, reject) => {
			const opening = factory.open(GH_CACHE_DATABASE, 1);
			opening.onerror = () => reject(opening.error);
			opening.onsuccess = () => {
				const db = opening.result;
				const tx = db.transaction("files", "readwrite");
				const store = tx.objectStore("files");
				const get = store.get(
					JSON.stringify([scope, target.postId, target.bucketKey])
				);
				get.onsuccess = () =>
					store.put({
						...get.result,
						payload: new Uint8Array([1, 2, 3]).buffer,
					});
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onabort = () => {
					db.close();
					reject(tx.error);
				};
			};
		});
		expect(await client.read(target)).toBe(xml);
		expect(download).toHaveBeenCalledTimes(2);
		await waitForStored(cache);
		expect(await client.read(target)).toBe(xml);
		expect(download).toHaveBeenCalledTimes(2);
		cache.close();
	});
});
