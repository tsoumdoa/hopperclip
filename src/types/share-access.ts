import type { GetSharedPost } from "./types";

export type ShareAccessResult =
	| {
			status: "ok";
			sharedPost: NonNullable<GetSharedPost>;
			downloadUrl: string;
	  }
	| { status: "not_found" }
	| { status: "rate_limited"; retryAfterSeconds: number }
	| { status: "unavailable" };
