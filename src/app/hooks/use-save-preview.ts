import { useCallback } from "react";
import { useConvex, useMutation } from "convex/react";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { api } from "@convex/_generated/api";
import { PREVIEW_VERSION } from "@/types/preview";
import { buildPreview } from "../lib/build-preview";

export async function savePreviewIfNeeded(
	hasPreview: boolean | undefined,
	getPreview: () => Promise<{ version: number } | null>,
	save: () => Promise<unknown>
) {
	try {
		if (
			hasPreview === true ||
			(hasPreview === undefined &&
				(await getPreview())?.version === PREVIEW_VERSION)
		)
			return;
		// Defer parsing and never let optional preview work fail the user action.
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		await save();
	} catch {}
}

export function useSavePreview() {
	const convex = useConvex();
	const savePreview = useMutation(api.previews.savePreview);
	return useCallback(
		(
			storageKey: string,
			source: string | ParsedGrasshopper,
			hasPreview?: boolean
		) => {
			void savePreviewIfNeeded(
				hasPreview,
				() => convex.query(api.previews.getPreview, { storageKey }),
				async () => {
					const parsed =
						typeof source === "string"
							? buildGhJson(source, { includeVisuals: true })
							: source;
					await savePreview({
						storageKey,
						version: PREVIEW_VERSION,
						data: buildPreview(parsed),
					});
				}
			);
		},
		[convex, savePreview]
	);
}
