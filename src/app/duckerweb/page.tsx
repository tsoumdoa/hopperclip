"use client";

import Header from "@/app/components/header";
import { useDuckerwebState } from "./hooks/use-duckerweb-state";
import { useMarkdownExport } from "./hooks/use-markdown-export";
import { DuckerwebMainZone } from "./components/DuckerwebMainZone";
import { XmlPasteArea } from "./components/XmlPasteArea";
import { ViewControls } from "./components/ViewControls";
import { ComponentList } from "./components/ComponentList";
import { GHFlowCanvas } from "./components/GHFlowCanvas";
import { GHJsonView } from "./components/GHJsonView";
import { GHDiffView } from "./components/GHDiffView";
import type { ViewMode } from "./types/type";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { useNativeGhXmlPaste } from "../hooks/use-native-gh-xml-paste";
import { resolveDuckerwebPasteTarget } from "./hooks/use-duckerweb-state";

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

export default function DuckerWebPage() {
	const {
		xmlData,
		isValidXml,
		xmlError,
		parsedData,
		viewMode,
		nodes,
		edges,
		error,
		diffResult,
		diffError,
		fileName,
		comparisonFileName,
		comparisonRejected,
		handlePasteFromClipboard,
		handlePastedXml,
		handleFileSelected,
		handlePasteComparison,
		handlePastedComparisonXml,
		handleComparisonFileSelected,
		handleClearComparison,
		handleClear,
		setViewMode,
	} = useDuckerwebState();

	const { handleCopyAll, isCopied } = useMarkdownExport(parsedData);

	const isDiff = viewMode === "diff";
	const layout = viewLayouts[viewMode];
	const nativePasteTarget = resolveDuckerwebPasteTarget(viewMode);
	const handleNativePaste = useCallback(
		(text: string) => {
			if (nativePasteTarget === "comparison") {
				handlePastedComparisonXml(text);
			} else {
				handlePastedXml(text);
			}
		},
		[nativePasteTarget, handlePastedComparisonXml, handlePastedXml]
	);
	useNativeGhXmlPaste({ enabled: true, onPasteText: handleNativePaste });

	const views: Record<ViewMode, React.ReactNode> = {
		flow: <GHFlowCanvas nodes={nodes} edges={edges} />,
		diff: (
			<GHDiffView
				diff={diffResult}
				error={diffError}
				onPasteComparison={handlePasteComparison}
				onFileSelected={handleComparisonFileSelected}
				onClearComparison={handleClearComparison}
				originalFileName={fileName}
				comparisonFileName={comparisonFileName}
				comparisonRejected={comparisonRejected}
			/>
		),
		list: parsedData && <ComponentList parsedData={parsedData} />,
		json: parsedData && <GHJsonView data={parsedData} />,
	};

	return (
		<DuckerwebMainZone
			onFileSelected={
				isDiff ? handleComparisonFileSelected : handleFileSelected
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
					<div className="flex items-center justify-between pb-4">
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

					{parsedData ? (
						<div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-2">
							<XmlPasteArea
								xmlData={xmlData}
								isValidXml={isValidXml}
								xmlError={xmlError}
								fileName={fileName}
								compact
								onPaste={handlePasteFromClipboard}
								onFileSelected={handleFileSelected}
								onClear={handleClear}
							/>
							<ViewControls
								viewMode={viewMode}
								isCopied={isCopied}
								onCopyAll={handleCopyAll}
								onSetViewMode={setViewMode}
							/>
						</div>
					) : (
						<XmlPasteArea
							xmlData={xmlData}
							isValidXml={isValidXml}
							xmlError={xmlError}
							fileName={fileName}
							onPaste={handlePasteFromClipboard}
							onFileSelected={handleFileSelected}
							onClear={handleClear}
						/>
					)}

					<div className="py-2" />
					{error && <p className="mb-4 text-red-400">{error}</p>}
				</div>
			</div>

			{parsedData && (
				<div className={layout.outer}>
					<div className={cn(contentWidth, layout.inner)}>
						{views[viewMode]}
					</div>
				</div>
			)}
		</DuckerwebMainZone>
	);
}
