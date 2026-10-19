export const GH_CACHE_BUDGET = 25 * 1024 * 1024;
export const GH_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const GH_CACHE_DATABASE = "hopperclip-gh-payloads-v1";

type CacheState = {
	id: "state";
	scope: string | null;
	epoch: number;
	bytes: number;
};

type CachedFile = {
	key: string;
	scope: string;
	postId: string;
	bucketKey: string;
	storedAt: number;
	lastUsedAt: number;
	checksum: string;
	accountedBytes: number;
	payload: ArrayBuffer;
};

export type CacheLease = { scope: string; epoch: number };

function request<T>(value: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		value.onsuccess = () => resolve(value.result);
		value.onerror = () => reject(value.error);
	});
}

/** Disposable data only. All accounting and invalidation fences are transactional. */
export class GhPayloadCache {
	private connection: Promise<IDBDatabase> | undefined;

	constructor(
		private readonly factory: () => IDBFactory = () => indexedDB,
		private readonly budget = GH_CACHE_BUDGET,
		private readonly now = () => Date.now()
	) {}

	private open(): Promise<IDBDatabase> {
		if (this.connection) return this.connection;
		this.connection = new Promise<IDBDatabase>((resolve, reject) => {
			const opening = this.factory().open(GH_CACHE_DATABASE, 1);
			let abandoned = false;
			const timer = setTimeout(() => {
				abandoned = true;
				reject(new Error("Local cache is unavailable"));
			}, 1000);
			opening.onupgradeneeded = () => {
				const files = opening.result.createObjectStore("files", {
					keyPath: "key",
				});
				files.createIndex("post", ["scope", "postId"]);
				files.createIndex("lastUsedAt", "lastUsedAt");
				files.createIndex("storedAt", "storedAt");
				opening.result.createObjectStore("meta", { keyPath: "id" });
			};
			opening.onerror = () => {
				clearTimeout(timer);
				reject(opening.error);
			};
			opening.onsuccess = () => {
				clearTimeout(timer);
				const db = opening.result;
				if (abandoned) {
					db.close();
					return;
				}
				db.onversionchange = () => {
					db.close();
					this.connection = undefined;
				};
				db.onclose = () => {
					this.connection = undefined;
				};
				resolve(db);
			};
		}).catch((error) => {
			this.connection = undefined;
			throw error;
		});
		return this.connection;
	}

	private async transaction<T>(
		mode: IDBTransactionMode,
		action: (files: IDBObjectStore, meta: IDBObjectStore) => Promise<T>
	): Promise<T> {
		const db = await this.open();
		const tx = db.transaction(["files", "meta"], mode);
		return new Promise<T>((resolve, reject) => {
			let result: T;
			let failure: unknown;
			tx.oncomplete = () => resolve(result);
			tx.onabort = () =>
				reject(failure ?? tx.error ?? new Error("Cache transaction aborted"));
			tx.onerror = () => {
				/* onabort handles request errors. */
			};
			void action(tx.objectStore("files"), tx.objectStore("meta")).then(
				(value) => {
					result = value;
				},
				(error) => {
					failure = error;
					try {
						tx.abort();
					} catch {
						reject(error);
					}
				}
			);
		});
	}

	private async state(meta: IDBObjectStore): Promise<CacheState> {
		return (
			(await request(meta.get("state"))) ?? {
				id: "state",
				scope: null,
				epoch: 0,
				bytes: 0,
			}
		);
	}

	private async remove(
		cursorRequest: IDBRequest<IDBCursorWithValue | null>,
		state: CacheState,
		until = () => false
	): Promise<void> {
		let cursor = await request(cursorRequest);
		while (cursor && !until()) {
			const file = cursor.value as CachedFile;
			state.bytes = Math.max(0, state.bytes - file.accountedBytes);
			await request(cursor.delete());
			cursor.continue();
			cursor = await request(cursorRequest);
		}
	}

	async activate(scope: string | null): Promise<void> {
		await this.transaction("readwrite", async (files, meta) => {
			const state = await this.state(meta);
			if (state.scope !== scope) {
				await request(files.clear());
				state.scope = scope;
				state.epoch++;
				state.bytes = 0;
			} else {
				await this.remove(
					files
						.index("storedAt")
						.openCursor(IDBKeyRange.upperBound(this.now() - GH_CACHE_MAX_AGE)),
					state
				);
			}
			await request(meta.put(state));
		});
	}

	async lease(scope: string): Promise<CacheLease | null> {
		return this.transaction("readonly", async (_, meta) => {
			const state = await this.state(meta);
			return state.scope === scope ? { scope, epoch: state.epoch } : null;
		});
	}

	async read(
		lease: CacheLease,
		postId: string,
		bucketKey: string
	): Promise<CachedFile | null> {
		return this.transaction("readwrite", async (files, meta) => {
			const state = await this.state(meta);
			if (state.scope !== lease.scope || state.epoch !== lease.epoch)
				return null;
			const key = JSON.stringify([lease.scope, postId, bucketKey]);
			const file: CachedFile | undefined = await request(files.get(key));
			if (!file) return null;
			if (
				file.storedAt > this.now() ||
				this.now() - file.storedAt >= GH_CACHE_MAX_AGE
			) {
				await request(files.delete(key));
				state.bytes = Math.max(0, state.bytes - file.accountedBytes);
				await request(meta.put(state));
				return null;
			}
			file.lastUsedAt = this.now();
			await request(files.put(file));
			return file;
		});
	}

	async write(
		lease: CacheLease,
		postId: string,
		bucketKey: string,
		payload: ArrayBuffer,
		checksum: string
	): Promise<boolean> {
		const metadata = {
			key: JSON.stringify([lease.scope, postId, bucketKey]),
			scope: lease.scope,
			postId,
			bucketKey,
			checksum,
			storedAt: this.now(),
			lastUsedAt: this.now(),
		};
		const accountedBytes =
			payload.byteLength +
			new TextEncoder().encode(JSON.stringify(metadata)).byteLength +
			1024;
		if (accountedBytes > this.budget) return false;
		return this.transaction("readwrite", async (files, meta) => {
			const state = await this.state(meta);
			if (state.scope !== lease.scope || state.epoch !== lease.epoch)
				return false;
			await this.remove(
				files
					.index("storedAt")
					.openCursor(IDBKeyRange.upperBound(this.now() - GH_CACHE_MAX_AGE)),
				state
			);
			// A concurrent tab may have already saved this version. Do not extend its TTL.
			if (await request(files.get(metadata.key))) {
				await request(meta.put(state));
				return true;
			}
			await this.remove(
				files.index("post").openCursor(IDBKeyRange.only([lease.scope, postId])),
				state
			);
			await this.remove(
				files.index("lastUsedAt").openCursor(),
				state,
				() => state.bytes + accountedBytes <= this.budget
			);
			await request(
				files.put({ ...metadata, payload, accountedBytes } satisfies CachedFile)
			);
			state.bytes += accountedBytes;
			await request(meta.put(state));
			return true;
		});
	}

	async invalidate(scope: string, postId?: string): Promise<void> {
		await this.transaction("readwrite", async (files, meta) => {
			const state = await this.state(meta);
			if (state.scope !== scope) return;
			state.epoch++;
			if (postId) {
				await this.remove(
					files.index("post").openCursor(IDBKeyRange.only([scope, postId])),
					state
				);
			} else {
				await request(files.clear());
				state.bytes = 0;
			}
			await request(meta.put(state));
		});
	}

	close(): void {
		void this.connection?.then(
			(db) => db.close(),
			() => {}
		);
		this.connection = undefined;
	}
}

/** A slow/blocked browser store must not hold up an online download. */
export async function tryCache<T>(
	operation: Promise<T>,
	timeout = 100
): Promise<T | null> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			operation.catch(() => null),
			new Promise<null>((resolve) => {
				timer = setTimeout(() => resolve(null), timeout);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
