import {
	Clipboard,
	Code,
	FileUp,
	GitBranch,
	GitCompareArrows,
	List,
	Loader2,
	Lock,
	Sparkles,
	X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { XmlPasteAreaProps } from "../types/type";
import { useModifierKeyLabel } from "../../hooks/use-modifier-key-label";

const capabilities = [
	{ icon: GitBranch, label: "Graph", hint: "Pan and zoom" },
	{ icon: GitCompareArrows, label: "Diff", hint: "Compare versions" },
	{ icon: List, label: "List", hint: "Every component" },
	{ icon: Code, label: "Export", hint: "Markdown or JSON" },
];

function EmptyDropZone(props: {
	modifier: string;
	xmlError: string;
	onPaste: () => void;
	onBrowse: () => void;
	onLoadSample?: () => Promise<void>;
	children: ReactNode;
}) {
	const [loadingSample, setLoadingSample] = useState(false);

	const handleSample = async () => {
		if (!props.onLoadSample) return;
		setLoadingSample(true);
		try {
			await props.onLoadSample();
		} finally {
			setLoadingSample(false);
		}
	};

	return (
		<div className="flex min-h-[420px] flex-1 flex-col items-center justify-between gap-8 rounded-2xl border border-dashed border-white/15 bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:20px_20px] px-6 py-8 text-center">
			<div />
			<div className="flex flex-col items-center">
				<div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-green-300/20 bg-green-300/[0.07] shadow-[0_0_40px_-10px] shadow-green-300/40">
					<FileUp className="size-7 text-green-300" aria-hidden />
				</div>
				<p className="text-xl font-semibold tracking-tight text-neutral-50">
					Drop a .gh or .ghx file anywhere
				</p>
				<p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-sm text-neutral-500">
					or copy components in Grasshopper and press
					<Kbd>{props.modifier}</Kbd>
					<Kbd>V</Kbd>
				</p>

				{props.xmlError.length > 0 && (
					<div className="mt-5 max-w-lg rounded-lg border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-sm whitespace-pre-line text-red-300">
						{props.xmlError}
					</div>
				)}

				<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
					<Button type="button" onClick={props.onPaste}>
						<Clipboard className="size-4" aria-hidden />
						Paste GhXml
					</Button>
					<Button
						type="button"
						onClick={props.onBrowse}
						variant="outline"
						data-testid="gh-file-browse-button"
					>
						<FileUp className="size-4 text-neutral-400" aria-hidden />
						Browse files
					</Button>
					{props.onLoadSample && (
						<Button
							type="button"
							onClick={handleSample}
							disabled={loadingSample}
							variant="ghost"
						>
							{loadingSample ? (
								<Loader2 className="size-4 animate-spin" aria-hidden />
							) : (
								<Sparkles className="size-4" aria-hidden />
							)}
							Try a sample
						</Button>
					)}
					{props.children}
				</div>
			</div>

			<div className="flex w-full max-w-3xl flex-col items-center gap-4">
				<ul className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
					{capabilities.map(({ icon: Icon, label, hint }) => (
						<li
							key={label}
							className="bg-background/70 flex items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2.5 text-left"
						>
							<Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
							<div className="min-w-0">
								<div className="text-sm font-medium text-neutral-200">
									{label}
								</div>
								<div className="truncate text-xs text-neutral-500">{hint}</div>
							</div>
						</li>
					))}
				</ul>
				<p className="flex items-center gap-1.5 text-xs text-neutral-500">
					<Lock className="size-3" aria-hidden />
					Parsed locally in your browser — files are never uploaded.
				</p>
			</div>
		</div>
	);
}

export function XmlPasteArea({
	xmlData,
	isValidXml,
	xmlError,
	fileName,
	onPaste,
	onFileSelected,
	onClear,
	onLoadSample,
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

	if (hasLoadedDefinition) {
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
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-xs text-red-400 hover:text-red-300"
							onClick={onClear}
						>
							Clear
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
					<Button
						type="button"
						onClick={onPaste}
						title="Paste a new GhXml definition"
						variant="outline"
						size="sm"
						className="text-xs"
					>
						<Clipboard className="h-3.5 w-3.5 text-neutral-400" />
						Paste new
						<span className="rounded border border-neutral-700 px-1 py-0.5 font-mono text-[10px] text-neutral-500">
							{modifier}+V
						</span>
					</Button>
					<Button
						type="button"
						onClick={() => inputRef.current?.click()}
						title="Browse for a new .gh or .ghx file"
						variant="outline"
						size="sm"
						className="text-xs"
						data-testid="gh-file-browse-button"
					>
						<FileUp className="h-3.5 w-3.5 text-neutral-400" />
						Browse new
					</Button>
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
		<EmptyDropZone
			modifier={modifier}
			xmlError={xmlError}
			onPaste={onPaste}
			onBrowse={() => inputRef.current?.click()}
			onLoadSample={onLoadSample}
		>
			<input
				ref={inputRef}
				type="file"
				accept=".gh,.ghx,application/gzip,application/xml,application/octet-stream"
				onChange={handlePickerChange}
				className="hidden"
			/>
		</EmptyDropZone>
	);
}
