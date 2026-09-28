import { Clipboard, FileUp, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { XmlPasteAreaProps } from "../types/type";
import { useModifierKeyLabel } from "../../hooks/use-modifier-key-label";

const actionButtonClass =
	"flex w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export function XmlPasteArea({
	xmlData,
	isValidXml,
	xmlError,
	fileName,
	compact = false,
	onPaste,
	onFileSelected,
	onClear,
}: XmlPasteAreaProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const hasLoadedDefinition = Boolean(xmlData && isValidXml);
	const modifier = useModifierKeyLabel();

	const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			onFileSelected(files[0]);
		}
		event.target.value = "";
	};

	if (hasLoadedDefinition && compact) {
		return (
			<div className="contents">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-1.5 px-1 text-xs font-medium whitespace-nowrap text-green-300">
						<span aria-hidden>✓</span>
						GhXml validated
					</span>
					<div className="flex min-w-0 items-center gap-1 border-r border-neutral-800 pr-2">
						<span
							className="max-w-48 truncate text-xs font-medium text-neutral-300"
							title={fileName}
						>
							{fileName}
						</span>
						<button
							type="button"
							className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs whitespace-nowrap text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
							onClick={onClear}
						>
							Clear
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
					<button
						type="button"
						onClick={onPaste}
						title="Paste a new GhXml definition"
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium whitespace-nowrap text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none"
					>
						<Clipboard className="h-3.5 w-3.5 text-neutral-400" />
						Paste new
						<span className="rounded border border-neutral-700 px-1 py-0.5 font-mono text-[10px] text-neutral-500">
							{modifier}+V
						</span>
					</button>
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						title="Browse for a new .gh or .ghx file"
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium whitespace-nowrap text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none"
						data-testid="gh-file-browse-button"
					>
						<FileUp className="h-3.5 w-3.5 text-neutral-400" />
						Browse new
					</button>
					<input
						ref={inputRef}
						type="file"
						accept=".gh,.ghx,application/gzip,application/xml,application/octet-stream"
						onChange={handlePickerChange}
						className="hidden"
					/>
				</div>

				{xmlError.length > 0 && (
					<div className="basis-full rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
						{xmlError}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="mb-4">
			<div
				className={cn(
					"rounded-2xl border p-5",
					hasLoadedDefinition
						? "bg-card border-white/[0.08]"
						: "flex flex-col items-center border-dashed border-white/15 bg-white/[0.015] px-6 py-14 text-center md:py-20"
				)}
			>
				{hasLoadedDefinition ? (
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-300">
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
					<>
						<div className="mb-4 flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
							<FileUp className="size-6 text-neutral-400" aria-hidden />
						</div>
						<p className="text-lg font-semibold text-neutral-100">
							Drop a .gh or .ghx file anywhere
						</p>
						<p className="mt-1 mb-6 max-w-md text-sm text-neutral-500">
							Or copy components in Grasshopper and press {modifier}+V to paste.
							See the graph, list every component, or diff two versions.
						</p>
					</>
				)}

				<div
					className={cn(
						"grid grid-cols-1 gap-3 sm:grid-cols-2",
						!hasLoadedDefinition && "w-full max-w-lg"
					)}
				>
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

				{hasLoadedDefinition && (
					<p className="mt-3 text-center text-xs text-neutral-500">
						Press {modifier}+V to replace, or drag a file over this page to drop
						it anywhere in the view
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
