/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as ghCard from "../ghCard.js";
import type * as ghInternalMutation from "../ghInternalMutation.js";
import type * as ghPublicAction from "../ghPublicAction.js";
import type * as previewBackfill from "../previewBackfill.js";
import type * as previewBackfillNode from "../previewBackfillNode.js";
import type * as previewData from "../previewData.js";
import type * as previews from "../previews.js";
import type * as ranking from "../ranking.js";
import type * as rankingBackfill from "../rankingBackfill.js";
import type * as serverGateway from "../serverGateway.js";
import type * as shareAccess from "../shareAccess.js";
import type * as storage from "../storage.js";
import type * as storageActions from "../storageActions.js";
import type * as storageLifecycle from "../storageLifecycle.js";
import type * as storageR2 from "../storageR2.js";

import type {
	ApiFromModules,
	FilterApi,
	FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
	crons: typeof crons;
	ghCard: typeof ghCard;
	ghInternalMutation: typeof ghInternalMutation;
	ghPublicAction: typeof ghPublicAction;
	previewBackfill: typeof previewBackfill;
	previewBackfillNode: typeof previewBackfillNode;
	previewData: typeof previewData;
	previews: typeof previews;
	ranking: typeof ranking;
	rankingBackfill: typeof rankingBackfill;
	serverGateway: typeof serverGateway;
	shareAccess: typeof shareAccess;
	storage: typeof storage;
	storageActions: typeof storageActions;
	storageLifecycle: typeof storageLifecycle;
	storageR2: typeof storageR2;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
	typeof fullApi,
	FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
	typeof fullApi,
	FunctionReference<any, "internal">
>;

export declare const components: {
	previewBackfillPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"previewBackfillPool">;
};
