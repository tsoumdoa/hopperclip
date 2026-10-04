/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
	ApiFromModules,
	FilterApi,
	FunctionReference,
} from "convex/server";
import type * as ghCard from "../ghCard.js";
import type * as ghInternalMutation from "../ghInternalMutation.js";
import type * as ghInternalQuery from "../ghInternalQuery.js";
import type * as ghPublicAction from "../ghPublicAction.js";
import type * as serverGateway from "../serverGateway.js";
import type * as shareAccess from "../shareAccess.js";
import type * as storage from "../storage.js";
import type * as storageActions from "../storageActions.js";
import type * as storageLifecycle from "../storageLifecycle.js";
import type * as storageR2 from "../storageR2.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
	ghCard: typeof ghCard;
	ghInternalMutation: typeof ghInternalMutation;
	ghInternalQuery: typeof ghInternalQuery;
	ghPublicAction: typeof ghPublicAction;
	serverGateway: typeof serverGateway;
	shareAccess: typeof shareAccess;
	storage: typeof storage;
	storageActions: typeof storageActions;
	storageLifecycle: typeof storageLifecycle;
	storageR2: typeof storageR2;
}>;
export declare const api: FilterApi<
	typeof fullApi,
	FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
	typeof fullApi,
	FunctionReference<any, "internal">
>;

export declare const components: {};
