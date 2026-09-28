import { createFileRoute } from "@tanstack/react-router";
import { SiRefinedgithub } from "@icons-pack/react-simple-icons";
import { toast } from "sonner";
import Header from "@/app/components/header";
import { PageHeader } from "@/app/components/page-header";
import { useDuckerwebState } from "@/app/duckerweb/hooks/use-duckerweb-state";
import { useMarkdownExport } from "@/app/duckerweb/hooks/use-markdown-export";
import { DuckerwebMainZone } from "@/app/duckerweb/components/DuckerwebMainZone";
import { XmlPasteArea } from "@/app/duckerweb/components/XmlPasteArea";
import { ViewControls } from "@/app/duckerweb/components/ViewControls";
import { ComponentList } from "@/app/duckerweb/components/ComponentList";
import { GHFlowCanvas } from "@/app/duckerweb/components/GHFlowCanvas";
import { GHJsonView } from "@/app/duckerweb/components/GHJsonView";
import { GHDiffView } from "@/app/duckerweb/components/GHDiffView";
import type { ViewMode } from "@/app/duckerweb/types/type";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { useNativeGhXmlPaste } from "@/app/hooks/use-native-gh-xml-paste";
import { resolveDuckerwebPasteTarget } from "@/app/duckerweb/hooks/use-duckerweb-state";

const contentWidth = "mx-auto w-full max-w-400";
const SAMPLE_FILE_NAME = "surface-evaluation.ghx";
const SAMPLE_URL = `/samples/${SAMPLE_FILE_NAME}`;
const pagePadding = "px-4 md:px-6 2xl:px-10 min-[2200px]:px-16";

const viewLayouts: Record<ViewMode, { outer: string; inner?: string }> = {
	flow: {
		outer: `min-h-0 flex-1 pb-4 md:pb-6 ${pagePadding}`,
		inner: "h-full",
	},
	diff: {
		outer: `pb-6 lg:h-[calc(100dvh-1.5rem)] lg:min-h-[640px] lg:shrink-0 ${pagePadding}`,
		inner: "flex h-full flex-col",
	},
	list: {
		outer: `min-h-0 flex-1 overflow-y-auto pb-4 md:pb-6 ${pagePadding}`,
	},
	json: {
		outer: `min-h-0 flex-1 overflow-y-auto pb-4 md:pb-6 ${pagePadding}`,
	},
};

export const Route = createFileRoute("/_static/duckerweb")({
	head: () => ({
		meta: [{ title: "DuckerWeb | Hopper Clip" }],
	}),
	component: DuckerWebPage,
});

function DuckerWebPage() {
	const { state, actions } = useDuckerwebState();

	const { handleCopyAll, isCopied } = useMarkdownExport(state.parsedData);

	const isDiff = state.viewMode === "diff";
	const layout = viewLayouts[state.viewMode];
	const nativePasteTarget = resolveDuckerwebPasteTarget(state.viewMode);
	const handleNativePaste = useCallback(
		(text: string) => {
			if (nativePasteTarget === "comparison") {
				actions.handlePastedComparisonXml(text);
			} else {
				actions.handlePastedXml(text);
			}
		},
		[nativePasteTarget, actions]
	);
	useNativeGhXmlPaste({ enabled: true, onPasteText: handleNativePaste });

	const handleLoadSample = useCallback(async () => {
		try {
			const res = await fetch(SAMPLE_URL);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const blob = await res.blob();
			actions.handleFileSelected(new File([blob], SAMPLE_FILE_NAME));
		} catch {
			toast.error("Couldn't load the sample definition");
		}
	}, [actions]);

	const views: Record<ViewMode, React.ReactNode> = {
		flow: <GHFlowCanvas nodes={state.nodes} edges={state.edges} />,
		diff: (
			<GHDiffView
				diff={state.diffResult}
				error={state.diffError}
				onPasteComparison={actions.handlePasteComparison}
				onFileSelected={actions.handleComparisonFileSelected}
				onClearComparison={actions.handleClearComparison}
				originalFileName={state.fileName}
				comparisonFileName={state.comparisonFileName}
				comparisonRejected={state.comparisonRejected}
				matchByTypeGuid={state.matchByTypeGuid}
				diffNotice={state.diffNotice}
				onMatchByTypeGuidChange={actions.setMatchByTypeGuid}
			/>
		),
		list: state.parsedData && <ComponentList parsedData={state.parsedData} />,
		json: state.parsedData && <GHJsonView data={state.parsedData} />,
	};

	return (
		<DuckerwebMainZone
			onFileSelected={
				isDiff
					? actions.handleComparisonFileSelected
					: actions.handleFileSelected
			}
			dropTitle={isDiff ? "Drop changed .gh or .ghx definition" : undefined}
			className={cn(
				"bg-background text-foreground flex flex-col font-sans",
				isDiff ? "min-h-dvh" : "h-dvh overflow-hidden"
			)}
		>
			<div
				className={cn(
					"w-full",
					pagePadding,
					state.parsedData
						? "shrink-0"
						: "flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 md:pb-6"
				)}
			>
				<div
					className={cn(
						contentWidth,
						!state.parsedData && "flex flex-1 flex-col"
					)}
				>
					<Header />
					<PageHeader
						title="DuckerWeb"
						description={
							!state.parsedData &&
							"Inspect and diff Grasshopper definitions without Rhino — no account needed."
						}
						actions={
							<a
								href="https://github.com/tsoumdoa/hopperclip"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-white"
							>
								<SiRefinedgithub size={14} color="currentColor" aria-hidden />
								Source
							</a>
						}
					/>

					{state.parsedData ? (
						<div className="bg-card mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] p-2">
							<XmlPasteArea
								xmlData={state.xmlData}
								isValidXml={state.isValidXml}
								xmlError={state.xmlError}
								fileName={state.fileName}
								compact
								onPaste={actions.handlePasteFromClipboard}
								onFileSelected={actions.handleFileSelected}
								onClear={actions.handleClear}
							/>
							<ViewControls
								viewMode={state.viewMode}
								isCopied={isCopied}
								onCopyAll={handleCopyAll}
								onSetViewMode={actions.setViewMode}
							/>
						</div>
					) : (
						<XmlPasteArea
							xmlData={state.xmlData}
							isValidXml={state.isValidXml}
							xmlError={state.xmlError}
							fileName={state.fileName}
							onPaste={actions.handlePasteFromClipboard}
							onFileSelected={actions.handleFileSelected}
							onClear={actions.handleClear}
							onLoadSample={handleLoadSample}
						/>
					)}

					{state.error && <p className="mb-4 text-red-400">{state.error}</p>}
				</div>
			</div>

			{state.parsedData && (
				<div className={layout.outer}>
					<div className={cn(contentWidth, layout.inner)}>
						{views[state.viewMode]}
					</div>
				</div>
			)}
		</DuckerwebMainZone>
	);
}
