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
		handlePasteFromClipboard,
		handleFileSelected,
		handleClear,
		setViewMode,
	} = useDuckerwebState();

	const { handleCopyAll, isCopied } = useMarkdownExport(parsedData);

	return (
		<DuckerwebMainZone
			onFileSelected={handleFileSelected}
			className="flex h-dvh flex-col overflow-hidden bg-black font-sans text-white"
		>
			<div className="mx-auto w-full max-w-4xl shrink-0 px-4 pt-4 md:px-6 md:pt-6">
				<Header />
				<div className="flex items-center justify-between pb-4">
					<h1 className="text-lg font-medium">DuckerWeb</h1>
					<a
						href="https://github.com/mcneel/ducker"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
					>
						GitHub
					</a>
				</div>

				<XmlPasteArea
					xmlData={xmlData}
					isValidXml={isValidXml}
					xmlError={xmlError}
					onPaste={handlePasteFromClipboard}
					onFileSelected={handleFileSelected}
					onClear={handleClear}
				/>

				{parsedData && (
					<ViewControls
						viewMode={viewMode}
						isCopied={isCopied}
						onCopyAll={handleCopyAll}
						onSetViewMode={setViewMode}
					/>
				)}

				<div className="py-2" />
				{error && <p className="mb-4 text-red-400">{error}</p>}
			</div>

			{parsedData && viewMode === "flow" && (
				<div className="min-h-0 flex-1 px-4 pb-4 md:px-6 md:pb-6">
					<div className="mx-auto h-full w-full max-w-4xl">
						<GHFlowCanvas nodes={nodes} edges={edges} />
					</div>
				</div>
			)}

			{parsedData && viewMode !== "flow" && (
				<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
					<div className="mx-auto w-full max-w-4xl">
						{viewMode === "list" && <ComponentList parsedData={parsedData} />}

						{viewMode === "json" && <GHJsonView data={parsedData} />}
					</div>
				</div>
			)}
		</DuckerwebMainZone>
	);
}
