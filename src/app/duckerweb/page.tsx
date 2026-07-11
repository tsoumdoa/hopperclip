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
		<div className="min-h-screen overflow-x-hidden bg-black p-4 font-sans text-white md:p-6">
			<div className="mx-auto max-w-4xl">
				<DuckerwebMainZone onFileSelected={handleFileSelected}>
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

					{parsedData && viewMode === "flow" && (
						<div className="mb-6">
							<GHFlowCanvas nodes={nodes} edges={edges} />
						</div>
					)}

					{parsedData && viewMode === "list" && (
						<ComponentList parsedData={parsedData} />
					)}

					{parsedData && viewMode === "json" && (
						<GHJsonView data={parsedData} />
					)}
				</DuckerwebMainZone>
			</div>
		</div>
	);
}
