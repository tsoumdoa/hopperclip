import { MAX_COMPRESSED_GH_XML_BYTES } from "@/types/types";

const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

export class UploadRequestError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

export type UploadReservation = {
	key: string;
	clerkUserId: string;
	expiresAt: number;
};

export type UploadSession<Reservation extends UploadReservation> = {
	userId: string;
	reserve: () => Promise<Reservation>;
	complete: (reservation: Reservation) => Promise<unknown>;
};

type UploadDependencies<Reservation extends UploadReservation> = {
	trustedOrigin: string;
	allowLocalDevelopment?: boolean;
	authenticate: (
		signal: AbortSignal
	) => Promise<UploadSession<Reservation> | null>;
	put: (
		userId: string,
		key: string,
		bytes: Uint8Array<ArrayBuffer>,
		signal: AbortSignal
	) => Promise<void>;
	/** Translate known backend rate-limit errors without exposing their details. */
	rateLimitResponse?: (error: unknown) => Response | undefined;
};

function cancelBody(request: Request) {
	// Do not wait for an untrusted sender to finish before rejecting its request.
	void request.body?.cancel().catch(() => {});
}

function validateRequest(
	request: Request,
	trustedOrigin: string,
	allowLocalDevelopment: boolean
) {
	if (request.method !== "POST") {
		throw new UploadRequestError(405, "Method not allowed");
	}

	const origin = request.headers.get("origin");
	const requestOrigin = new URL(request.url);
	const localOrigin =
		allowLocalDevelopment &&
		["localhost", "127.0.0.1", "[::1]"].includes(requestOrigin.hostname) &&
		origin === requestOrigin.origin;
	// Compare the complete Origin string. A same-site sibling or a matching
	// suffix is not trusted, and missing/null Origin is not accepted.
	if (origin !== new URL(trustedOrigin).origin && !localOrigin) {
		throw new UploadRequestError(403, "Upload origin not allowed");
	}
	const fetchSite = request.headers.get("sec-fetch-site");
	if (fetchSite !== null && fetchSite !== "same-origin") {
		throw new UploadRequestError(403, "Upload origin not allowed");
	}

	if (request.headers.get("content-type") !== "application/gzip") {
		throw new UploadRequestError(415, "Upload must contain gzip data");
	}
	// gzip is the stored file format, not the HTTP transfer encoding: accepting
	// Content-Encoding here could let a proxy decompress before our byte cap.
	const encoding = request.headers.get("content-encoding");
	if (encoding && encoding !== "identity") {
		throw new UploadRequestError(415, "Unsupported upload encoding");
	}

	const header = request.headers.get("content-length");
	let declaredLength: number | undefined;
	if (header !== null) {
		if (!/^\d+$/.test(header)) {
			throw new UploadRequestError(400, "Invalid upload length");
		}
		declaredLength = Number(header);
		if (declaredLength > MAX_COMPRESSED_GH_XML_BYTES) {
			throw new UploadRequestError(413, "Upload exceeds 25 MiB");
		}
		if (declaredLength === 0) {
			throw new UploadRequestError(400, "Upload is empty");
		}
	}
	if (!request.body) {
		throw new UploadRequestError(400, "Upload is empty");
	}
	return declaredLength;
}

/** Read at most 25 MiB, independently of Content-Length, without JSON arrays. */
export async function readBoundedUpload(
	stream: ReadableStream<Uint8Array>,
	signal: AbortSignal,
	declaredLength?: number
): Promise<Uint8Array<ArrayBuffer>> {
	const reader = stream.getReader();
	const cancel = () => {
		void reader.cancel().catch(() => {});
	};
	let completed = false;
	signal.addEventListener("abort", cancel, { once: true });
	try {
		signal.throwIfAborted();
		// Allocate only once data arrives. Known lengths get one byte buffer;
		// otherwise grow from 64 KiB up to the hard cap without retaining chunks
		// or building the much larger number[]/JSON representation.
		let bytes = new Uint8Array(0);
		let length = 0;
		while (true) {
			const { done, value } = await reader.read();
			signal.throwIfAborted();
			if (done) break;
			if (value.byteLength > MAX_COMPRESSED_GH_XML_BYTES - length) {
				throw new UploadRequestError(413, "Upload exceeds 25 MiB");
			}
			const nextLength = length + value.byteLength;
			if (declaredLength !== undefined && nextLength > declaredLength) {
				throw new UploadRequestError(400, "Upload length does not match");
			}
			if (nextLength > bytes.byteLength) {
				const capacity =
					declaredLength ??
					Math.min(
						MAX_COMPRESSED_GH_XML_BYTES,
						Math.max(64 * 1024, bytes.byteLength * 2, nextLength)
					);
				const grown = new Uint8Array(capacity);
				grown.set(bytes.subarray(0, length));
				bytes = grown;
			}
			bytes.set(value, length);
			length = nextLength;
		}
		if (declaredLength !== undefined && length !== declaredLength) {
			throw new UploadRequestError(400, "Upload length does not match");
		}
		if (
			length < 18 ||
			bytes[0] !== 0x1f ||
			bytes[1] !== 0x8b ||
			bytes[2] !== 8 ||
			(bytes[3] & 0xe0) !== 0
		) {
			throw new UploadRequestError(400, "Upload must contain gzip data");
		}
		completed = true;
		return bytes.subarray(0, length);
	} finally {
		signal.removeEventListener("abort", cancel);
		if (!completed) cancel();
		reader.releaseLock();
	}
}

export function createUploadHandler<Reservation extends UploadReservation>(
	dependencies: UploadDependencies<Reservation>
) {
	return async (request: Request): Promise<Response> => {
		const signal = AbortSignal.any([
			request.signal,
			AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
		]);
		try {
			const declaredLength = validateRequest(
				request,
				dependencies.trustedOrigin,
				dependencies.allowLocalDevelopment ?? false
			);
			const session = await dependencies.authenticate(signal);
			if (!session) {
				throw new UploadRequestError(401, "Sign in to upload");
			}
			signal.throwIfAborted();
			// The durable reservation (including its rate limit) precedes any body
			// read or R2 write. Failed uploads are reclaimed without browser help.
			const reservation = await session.reserve();
			// The Convex JWT's custom id claim must identify the same Clerk user.
			// A mismatch would otherwise write a blob outside its cleanup ledger.
			if (reservation.clerkUserId !== session.userId) {
				throw new Error("Upload owner does not match the signed-in user");
			}
			const bytes = await readBoundedUpload(
				request.body!,
				signal,
				declaredLength
			);
			signal.throwIfAborted();
			if (reservation.expiresAt <= Date.now() + UPLOAD_TIMEOUT_MS) {
				throw new UploadRequestError(408, "Upload reservation expired");
			}
			await dependencies.put(
				reservation.clerkUserId,
				reservation.key,
				bytes,
				signal
			);
			signal.throwIfAborted();
			await session.complete(reservation);
			return Response.json(
				{ key: reservation.key },
				{ headers: { "Cache-Control": "no-store" } }
			);
		} catch (error) {
			cancelBody(request);
			const limited = dependencies.rateLimitResponse?.(error);
			if (limited) return limited;
			const status =
				error instanceof UploadRequestError
					? error.status
					: signal.aborted
						? 408
						: 503;
			const message =
				error instanceof UploadRequestError
					? error.message
					: signal.aborted
						? "Upload interrupted. Please try again."
						: "Upload failed. Please try again.";
			return Response.json(
				{ error: message },
				{ status, headers: { "Cache-Control": "no-store" } }
			);
		}
	};
}
