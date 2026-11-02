import { useCallback } from "react";
import { useMutation } from "convex/react";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { api } from "@convex/_generated/api";
import { PREVIEW_VERSION } from "@/types/preview";
import { buildPreview } from "../lib/build-preview";

export function useSavePreview() {
	const savePreview = useMutation(api.previews.savePreview);
	return useCallback(
		(storageKey: string, source: string | ParsedGrasshopper) => {
			// Defer parsing and never let optional preview work fail the user action.
			void Promise.resolve()
				.then(async () => {
					const parsed =
						typeof source === "string"
							? buildGhJson(source, { includeVisuals: true })
							: source;
					await savePreview({
						storageKey,
						version: PREVIEW_VERSION,
						data: buildPreview(parsed),
					});
				})
				.catch(() => {});
		},
		[savePreview]
	);
}
