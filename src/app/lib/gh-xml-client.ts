import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";
import { GhPayloadCache, tryCache } from "./gh-payload-cache";

export type GhXmlTarget = { postId: string; bucketKey: string };
export type GhDownload = GhXmlTarget & { userId: string; downloadUrl: string };
type ResolveDownload = (
	postId: string,
	signal: AbortSignal
) => Promise<GhDownload | null>;
type Inflight = {
	postId: string;
	controller: AbortController;
	promise: Promise<string>;
};

export function cancelledGhRead(): DOMException {
	return new DOMException("Snippet read cancelled", "AbortError");
}

export function isCancelledGhRead(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

async function checksum(payload: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", payload);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0")
	).join("");
}

async function decode(payload: ArrayBuffer): Promise<string> {
	if (payload.byteLength > MAX_COMPRESSED_GH_XML_BYTES)
		throw new Error("GhXml download is too large");
	const { decompress } = await import("../utils/gzip");
	return new TextDecoder("utf-8", { fatal: true }).decode(
		await decompress(payload)
	);
}

/** Shared by preview and Copy, but never by public share links. */
export class GhXmlClient {
	private userId: string | null = null;
	private scope: string | null = null;
	private ready: Promise<void> = Promise.resolve();
	private inflight = new Map<string, Inflight>();
	private channel: BroadcastChannel | undefined;

	constructor(
		private readonly deployment: string,
		private readonly resolve: ResolveDownload,
		private readonly cache = new GhPayloadCache(),
		private readonly download: typeof fetch = fetch
	) {}

	connect(): () => void {
		try {
			this.channel = new BroadcastChannel("hopperclip-gh-cache");
			this.channel.onmessage = (event: MessageEvent<unknown>) => {
				const message = event.data;
				if (
					!message ||
					typeof message !== "object" ||
					!("scope" in message) ||
					message.scope !== this.scope ||
					!("type" in message)
				)
					return;
				if (
					message.type === "invalidate" &&
					"postId" in message &&
					typeof message.postId === "string"
				) {
					this.cancel(message.postId);
				} else if (message.type === "clear" || message.type === "signout") {
					// Clerk owns identity. A delayed signout message may arrive after sign-in.
					this.cancel();
				}
			};
		} catch {
			/* Some private browsing environments disable messaging/storage. */
		}
		return () => {
			this.cancel();
			this.channel?.close();
			this.channel = undefined;
			this.cache.close();
		};
	}

	setUser(userId: string | null): void {
		const scope = userId ? JSON.stringify([this.deployment, userId]) : null;
		if (this.userId === userId && this.scope === scope && userId !== null)
			return;
		const previous = this.scope;
		this.cancel();
		this.userId = userId;
		this.scope = scope;
		if (previous) this.broadcast("signout", previous);
		// Serialize account transitions; failed persistence never disables online reads.
		this.ready = this.ready
			.then(() => this.cache.activate(scope))
			.catch(() => {});
	}

	private broadcast(
		type: "clear" | "signout" | "invalidate",
		scope: string,
		postId?: string
	): void {
		try {
			this.channel?.postMessage({ type, scope, postId });
		} catch {
			/* best effort */
		}
	}

	private cancel(postId?: string): void {
		for (const [key, request] of this.inflight) {
			if (postId && postId !== request.postId) continue;
			request.controller.abort();
			this.inflight.delete(key);
		}
	}

	/** Called only for confirmed content changes/deletes, never a failed edit. */
	invalidate(postId: string): void {
		const scope = this.scope;
		if (!scope) return;
		this.cancel(postId);
		this.broadcast("invalidate", scope, postId);
		void this.ready
			.then(() => this.cache.invalidate(scope, postId))
			.catch(() => {});
	}

	async clear(): Promise<void> {
		const scope = this.scope;
		if (!scope) return;
		this.cancel();
		this.broadcast("clear", scope);
		await this.ready;
		await this.cache.invalidate(scope);
	}

	read(target: GhXmlTarget, expectedUserId = this.userId): Promise<string> {
		const scope = this.scope;
		const userId = this.userId;
		if (expectedUserId !== userId) return Promise.reject(cancelledGhRead());
		if (!scope || !userId)
			return Promise.reject(new Error("Please sign in to open this snippet"));
		const key = JSON.stringify([scope, target.postId, target.bucketKey]);
		const existing = this.inflight.get(key);
		if (existing) return existing.promise;
		const controller = new AbortController();
		const assertCurrent = () => {
			if (controller.signal.aborted || this.scope !== scope)
				throw cancelledGhRead();
		};
		const promise = (async () => {
			// Only the cache fence is read alongside authorization, never cached content.
			const [file, initialLease] = await Promise.all([
				this.resolve(target.postId, controller.signal),
				tryCache(this.ready.then(() => this.cache.lease(scope))),
			]);
			assertCurrent();
			if (!file || file.userId !== userId || file.postId !== target.postId) {
				this.invalidate(target.postId);
				throw new Error("This snippet is no longer available");
			}
			if (file.bucketKey !== target.bucketKey) {
				this.invalidate(target.postId);
				throw new Error(
					"This snippet changed. Open it again to load the latest version."
				);
			}
			let lease = initialLease;
			if (lease) {
				const cached = await tryCache(
					this.cache.read(lease, target.postId, file.bucketKey)
				);
				assertCurrent();
				if (cached) {
					try {
						if ((await checksum(cached.payload)) !== cached.checksum)
							throw new Error("Invalid local copy");
						const xml = await decode(cached.payload);
						assertCurrent();
						return xml;
					} catch {
						assertCurrent();
						// A corrupt entry gets one fresh download, never a broken preview.
						await tryCache(this.cache.invalidate(scope, target.postId));
						lease = await tryCache(this.cache.lease(scope));
					}
				}
			}
			assertCurrent();
			const response = await this.download(file.downloadUrl, {
				cache: "no-store",
				signal: AbortSignal.any([
					controller.signal,
					AbortSignal.timeout(120_000),
				]),
				headers: {
					"Content-Encoding": "gzip",
					"Content-Type": "application/gzip",
				},
			});
			if (!response.ok)
				throw new Error("Could not download this snippet. Please try again.");
			const payload = await response.arrayBuffer();
			const xml = await decode(payload);
			assertCurrent();
			if (lease) {
				const writeLease = lease;
				void checksum(payload)
					.then((hash) => {
						assertCurrent();
						return this.cache.write(
							writeLease,
							target.postId,
							file.bucketKey,
							payload,
							hash
						);
					})
					.catch(() => {});
			}
			return xml;
		})().finally(() => {
			if (this.inflight.get(key)?.controller === controller)
				this.inflight.delete(key);
		});
		this.inflight.set(key, { postId: target.postId, controller, promise });
		return promise;
	}
}
