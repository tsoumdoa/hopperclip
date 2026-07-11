import { Clipboard, FileUp, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface XmlPasteAreaProps {
	xmlData: string | undefined;
	isValidXml: boolean;
	xmlError: string;
	onPaste: () => void;
	onFileSelected: (file: File) => void;
	onClear: () => void;
}

const actionButtonClass =
	"flex w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export function XmlPasteArea({
	xmlData,
	isValidXml,
	xmlError,
	onPaste,
	onFileSelected,
	onClear,
}: XmlPasteAreaProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const hasLoadedDefinition = Boolean(xmlData && isValidXml);

	const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			onFileSelected(files[0]);
		}
		event.target.value = "";
	};

	return (
		<div className="mb-6">
			<div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
				{hasLoadedDefinition ? (
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
							<span aria-hidden>✓</span>
							GhXml validated
						</span>
						<button
							type="button"
							className="inline-flex items-center gap-1.5 text-sm text-red-400 transition-colors hover:text-red-300"
							onClick={onClear}
						>
							Clear definition
							<X className="h-4 w-4" />
						</button>
					</div>
				) : (
					<p className="mb-4 text-sm leading-relaxed text-neutral-400">
						Import a Grasshopper definition to inspect its components. Paste
						GhXml from your clipboard, browse for a{" "}
						<span className="font-mono text-neutral-300">.gh</span> or{" "}
						<span className="font-mono text-neutral-300">.ghx</span> file, or
						drag and drop anywhere in this view.
					</p>
				)}

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<button type="button" onClick={onPaste} className={actionButtonClass}>
						<Clipboard className="h-4 w-4 shrink-0 text-neutral-400" />
						<span>
							{hasLoadedDefinition
								? "Paste new GhXml"
								: "Paste GhXml from clipboard"}
						</span>
					</button>

					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						className={actionButtonClass}
						data-testid="gh-file-browse-button"
					>
						<FileUp className="h-4 w-4 shrink-0 text-neutral-400" />
						<span>
							{hasLoadedDefinition
								? "Browse for new file"
								: "Browse .gh or .ghx file"}
						</span>
					</button>
					<input
						ref={inputRef}
						type="file"
						accept=".gh,.ghx,application/gzip,application/xml,application/octet-stream"
						onChange={handlePickerChange}
						className="hidden"
					/>
				</div>

				{!hasLoadedDefinition && (
					<p className="mt-3 text-center text-xs text-neutral-500">
						Drag a file over this page to drop it anywhere in the view
					</p>
				)}
			</div>

			{xmlError.length > 0 && (
				<div
					className={cn(
						"mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300"
					)}
				>
					{xmlError}
				</div>
			)}
		</div>
	);
}
