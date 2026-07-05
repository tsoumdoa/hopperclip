"use client";

import { useDuckerwebState } from "./hooks/use-duckerweb-state";
import { useMarkdownExport } from "./hooks/use-markdown-export";
import { DuckerwebHeader } from "./components/DuckerwebHeader";
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
		handleClear,
		setViewMode,
	} = useDuckerwebState();

	const { handleCopyAll, isCopied } = useMarkdownExport(parsedData);

	return (
		<div className="min-h-screen overflow-x-hidden bg-black p-4 font-sans text-white md:p-6">
			<div className="mx-auto max-w-4xl">
				<DuckerwebHeader />

				<XmlPasteArea
					xmlData={xmlData}
					isValidXml={isValidXml}
					xmlError={xmlError}
					onPaste={handlePasteFromClipboard}
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

				{parsedData && viewMode === "json" && <GHJsonView data={parsedData} />}
			</div>
		</div>
	);
}
