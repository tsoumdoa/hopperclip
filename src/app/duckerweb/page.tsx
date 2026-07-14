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
import { cn } from "@/lib/utils";

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
		handlePasteFromClipboard,
		handleFileSelected,
		handlePasteComparison,
		handleComparisonFileSelected,
		handleClearComparison,
		handleClear,
		setViewMode,
	} = useDuckerwebState();

	const { handleCopyAll, isCopied } = useMarkdownExport(parsedData);

	return (
		<DuckerwebMainZone
			onFileSelected={
				viewMode === "diff" ? handleComparisonFileSelected : handleFileSelected
			}
			dropTitle={
				viewMode === "diff" ? "Drop changed .gh or .ghx definition" : undefined
			}
			className={cn(
				"flex flex-col bg-black font-sans text-white",
				viewMode === "diff" ? "min-h-dvh" : "h-dvh overflow-hidden"
			)}
		>
			<div className="w-full shrink-0 px-4 pt-4 md:px-6 md:pt-6">
				<div className="mx-auto w-full max-w-6xl">
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
							onPaste={handlePasteFromClipboard}
							onFileSelected={handleFileSelected}
							onClear={handleClear}
						/>
					)}

					<div className="py-2" />
					{error && <p className="mb-4 text-red-400">{error}</p>}
				</div>
			</div>

			{parsedData && viewMode === "flow" && (
				<div className="min-h-0 flex-1 px-4 pb-4 md:px-6 md:pb-6">
					<div className="mx-auto h-full w-full max-w-6xl">
						<GHFlowCanvas nodes={nodes} edges={edges} />
					</div>
				</div>
			)}

			{parsedData && viewMode !== "flow" && viewMode !== "diff" && (
				<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
					<div className="mx-auto w-full max-w-6xl">
						{viewMode === "list" && <ComponentList parsedData={parsedData} />}

						{viewMode === "json" && <GHJsonView data={parsedData} />}
					</div>
				</div>
			)}

			{parsedData && viewMode === "diff" && (
				<div className="px-4 pb-6 md:px-6 lg:h-[calc(100dvh-1.5rem)] lg:min-h-[640px] lg:shrink-0">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col">
						<GHDiffView
							diff={diffResult}
							error={diffError}
							onPasteComparison={handlePasteComparison}
							onFileSelected={handleComparisonFileSelected}
							onClearComparison={handleClearComparison}
						/>
					</div>
				</div>
			)}
		</DuckerwebMainZone>
	);
}
