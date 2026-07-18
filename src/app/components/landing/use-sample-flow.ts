import { useMemo } from "react";
import { createFlowPreview } from "@/app/duckerweb/gh-flow-generator";
// Vite raw import — bundles the XML as a string at build time. File is inside
// src/ so the import resolves cleanly in both client and SSR.
import sampleXml from "./sample.xml?raw";

export type SampleFlow = ReturnType<typeof createFlowPreview>;

/**
 * Parse the bundled sample Grasshopper definition into the same nodes/edges
 * shape DuckerWeb uses, so landing pages can render the real flow canvas
 * without any user input.
 */
export function useSampleFlow(): SampleFlow {
	return useMemo(() => createFlowPreview(sampleXml), []);
}
