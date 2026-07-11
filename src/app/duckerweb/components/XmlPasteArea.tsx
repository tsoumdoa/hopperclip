import { X } from "lucide-react";
import { PasteButton } from "./PasteButton";
import { GhFileDropzone } from "@/app/components/gh-file-dropzone";

interface XmlPasteAreaProps {
	xmlData: string | undefined;
	isValidXml: boolean;
	xmlError: string;
	onPaste: () => void;
	onFileSelected: (file: File) => void;
	onClear: () => void;
}

export function XmlPasteArea({
	xmlData,
	isValidXml,
	xmlError,
	onPaste,
	onFileSelected,
	onClear,
}: XmlPasteAreaProps) {
	const hasLoadedDefinition = Boolean(xmlData && isValidXml);

	return (
		<div className="mb-6">
			<div className="space-y-2">
				{hasLoadedDefinition ? (
					<div className="flex flex-row items-center gap-x-2">
						<button
							type="button"
							className="flex flex-row items-center gap-x-1 text-sm text-red-500 hover:cursor-pointer"
							onClick={onClear}
						>
							Clear current definition
							<X size={16} />
						</button>
						<span className="text-sm font-bold text-green-600 hover:cursor-default">
							✓ GhXml validated
						</span>
					</div>
				) : (
					<p className="mb-2 text-sm text-neutral-400">
						Import a Grasshopper definition to inspect its components. Paste
						GhXml from your clipboard, or drop a{" "}
						<span className="font-mono">.gh</span>/
						<span className="font-mono">.ghx</span> file.
					</p>
				)}
				<div className="flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onClick={onPaste}
						className="animate border-input flex-1 rounded-md border bg-neutral-100 p-2 font-medium text-neutral-500 shadow-xs transition-all hover:text-neutral-700"
					>
						<PasteButton isReplacement={hasLoadedDefinition} />
					</button>
					<GhFileDropzone
						className="flex-1"
						onFileSelected={onFileSelected}
						idleLabel={
							hasLoadedDefinition
								? "Drop a new .gh or .ghx file, or click to browse"
								: undefined
						}
					/>
				</div>
			</div>
			{xmlError.length > 0 && (
				<div className="mt-2 text-sm font-bold text-red-500">{xmlError}</div>
			)}
		</div>
	);
}
