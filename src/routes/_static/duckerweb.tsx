import { createFileRoute } from "@tanstack/react-router";
import Header from "@/app/components/header";
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

const contentWidth =
	"mx-auto w-full max-w-6xl min-[2200px]:max-w-[140rem] 2xl:max-w-[100rem]";

const viewLayouts: Record<ViewMode, { outer: string; inner?: string }> = {
	flow: { outer: "min-h-0 flex-1 px-4 pb-4 md:px-6 md:pb-6", inner: "h-full" },
	diff: {
		outer:
			"px-4 pb-6 md:px-6 lg:h-[calc(100dvh-1.5rem)] lg:min-h-[640px] lg:shrink-0",
		inner: "flex h-full flex-col",
	},
	list: { outer: "min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6" },
	json: { outer: "min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6" },
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
				"flex flex-col bg-black font-sans text-white",
				isDiff ? "min-h-dvh" : "h-dvh overflow-hidden"
			)}
		>
			<div className="w-full shrink-0 px-4 pt-4 md:px-6 md:pt-6">
				<div className={contentWidth}>
					<Header />
					<div className="flex items-center justify-between pb-2">
						<h1 className="text-lg font-medium">DuckerWeb</h1>
						<a
							href="https://github.com/tsoumdoa/hopperclip"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
						>
							GitHub
						</a>
					</div>

					{state.parsedData ? (
						<div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-2">
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
						/>
					)}

					<div className="py-2" />
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
