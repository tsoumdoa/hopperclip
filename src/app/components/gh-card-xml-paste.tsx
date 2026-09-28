import { CheckCircle2, Clipboard, FileUp, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { validateGhXml } from "../utils/gh-xml";
import { GhFileError, ghFileToGhXml } from "../utils/gh-file";
import { useModifierKeyLabel } from "../hooks/use-modifier-key-label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
	GhCardXmlPasteProps,
	IngestResult,
	UseXmlPasteHandlerOptions,
} from "@/types/gh-card";

export function sanitizeGhCardName(raw: string): string {
	return raw
		.trim()
		.replace(/[^\p{L}\p{N}]/gu, "")
		.slice(0, 30);
}

export function getGhCardNameFromFileName(fileName: string): string {
	return fileName.replace(/\.(?:gh|ghx)$/i, "").slice(0, 30);
}

export function shouldAutoFillGhCardName(
	currentName: string,
	autoFilledName: string | null
): boolean {
	return (
		currentName.length === 0 ||
		(autoFilledName !== null && currentName === autoFilledName)
	);
}

export function getSingleScriptNickName(
	parsed: ParsedGrasshopper
): string | undefined {
	const components = Object.values(parsed.components);
	if (components.length !== 1 || !components[0]?.script) {
		return undefined;
	}
	const sanitized = sanitizeGhCardName(components[0].nickName);
	return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Validate GhXml and, if valid, also extract the single-script-component
 * nickname. Pure function — no React state, no I/O. The hook layer wires
 * this to its setters; tests exercise this directly.
 */
export function ingestGhXml(
	xml: string,
	source: "clipboard" | "file",
	options?: { onSingleScriptComponent?: (nickName: string) => void }
): IngestResult {
	const { isValid, errorMsg } = validateGhXml(xml);

	if (isValid) {
		try {
			const parsed = buildGhJson(xml);
			const nickName = getSingleScriptNickName(parsed);
			if (nickName) {
				options?.onSingleScriptComponent?.(nickName);
			}
		} catch {
			// Parse failure should not block a valid XML paste.
		}
		return { isValid: true, xml };
	}

	return {
		isValid: false,
		errorMsg: `${source === "file" ? "Selected" : "Pasted"} GhXml is not valid: \n${
			errorMsg ?? ""
		}`,
	};
}

export function GhCardXmlPaste(props: GhCardXmlPasteProps) {
	const { xmlData, isValidXml, setXmlError } = props;
	const inputRef = useRef<HTMLInputElement>(null);
	const modifier = useModifierKeyLabel();

	useEffect(() => {
		if (xmlData && isValidXml) {
			setXmlError("");
		}
	}, [xmlData, isValidXml, setXmlError]);

	const handleClear = () => {
		props.setXmlData(undefined);
		props.setXmlError("");
		props.onClearPastedXml?.();
	};

	const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			props.handleFileSelected(files[0]);
		}
		event.target.value = "";
	};

	return (
		<div className="text-sm">
			{props.xmlData ? (
				<div
					className={cn(
						"flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
						props.isValidXml
							? "border-green-300/25 bg-green-300/[0.06]"
							: "border-red-500/25 bg-red-500/[0.06]"
					)}
				>
					{props.isValidXml ? (
						<span className="inline-flex items-center gap-2 font-medium text-green-300">
							<CheckCircle2 className="size-4" aria-hidden />
							{props.isEditMode ? "New GhXml ready" : "GhXml validated"}
						</span>
					) : (
						<span className="font-medium text-red-400">Invalid GhXml</span>
					)}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-auto py-1 text-xs text-neutral-400 hover:text-white"
						onClick={handleClear}
					>
						<X className="size-3.5" aria-hidden />
						Remove
					</Button>
				</div>
			) : (
				<div
					className={cn(
						"flex flex-col gap-2",
						!props.isEditMode &&
							"items-center rounded-lg border border-dashed border-white/15 px-4 py-6 text-center"
					)}
				>
					{!props.isEditMode && (
						<div className="mb-1 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
							<FileUp className="size-4 text-neutral-400" aria-hidden />
						</div>
					)}
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							onClick={props.handlePasteFromClipboard}
							variant="outline"
							size="sm"
						>
							<Clipboard className="size-3.5 text-neutral-400" aria-hidden />
							Paste GhXml
						</Button>
						<Button
							type="button"
							onClick={() => inputRef.current?.click()}
							variant="outline"
							size="sm"
							data-testid="gh-file-browse-button"
						>
							<FileUp className="size-3.5 text-neutral-400" aria-hidden />
							Browse .gh / .ghx
						</Button>
					</div>
					<p className="text-xs text-neutral-500">
						{props.pasteShortcutEnabled ? (
							<>
								Copy components in Grasshopper, then press {modifier}+V here —
								or drop a file
							</>
						) : (
							"or drop a file onto this card"
						)}
					</p>
					<input
						ref={inputRef}
						type="file"
						accept=".gh,.ghx,application/gzip,application/xml,application/octet-stream"
						onChange={handlePickerChange}
						className="hidden"
					/>
				</div>
			)}
			{props.xmlError.length > 0 && (
				<div className="mt-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm whitespace-pre-line text-red-300">
					{props.xmlError}
				</div>
			)}
		</div>
	);
}

/**
 * Returns handlers for populating `xmlData` from either the clipboard or a
 * dropped/picked `.gh`/`.ghx` file. Both paths share the same
 * validation + parse + state-update sequence so the UI shows one consistent
 * "✓ GhXml validated" success state regardless of input source.
 */
export function useXmlPasteHandler(
	setXmlData: (data: string | undefined) => void,
	setIsValidXml: (valid: boolean) => void,
	setXmlError: (error: string) => void,
	options?: UseXmlPasteHandlerOptions
) {
	const activeRequest = useRef(0);
	const invalidatePendingImport = useCallback(() => {
		activeRequest.current += 1;
	}, []);
	const beginClipboardImport = (trigger: "button" | "shortcut") => {
		const requestId = ++activeRequest.current;
		setXmlError("");
		setXmlData("");
		setIsValidXml(false);
		posthog.capture("user_pasted", { source: "clipboard", trigger });
		return requestId;
	};
	const applyPastedText = (text: string, requestId: number) => {
		if (requestId !== activeRequest.current) return;
		if (text.length === 0) {
			setXmlError("Clipboard is empty");
			return;
		}
		const result = ingestGhXml(text, "clipboard", options);
		if (result.isValid) {
			setIsValidXml(true);
			setXmlData(text);
		} else {
			setXmlError(result.errorMsg ?? "Pasted GhXml is not valid");
		}
	};

	const handlePastedText = (text: string) => {
		const requestId = beginClipboardImport("shortcut");
		applyPastedText(text, requestId);
	};

	const handlePasteFromClipboard = async () => {
		const requestId = beginClipboardImport("button");

		try {
			const text = await navigator.clipboard.readText();
			applyPastedText(text, requestId);
		} catch (err) {
			if (requestId !== activeRequest.current) return;
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	};

	const handleFileSelected = async (file: File) => {
		const requestId = ++activeRequest.current;
		setXmlError("");
		setXmlData("");
		setIsValidXml(false);

		posthog.capture("user_pasted", {
			source: "file",
			ext: file.name.includes(".") ? file.name.split(".").pop() : "unknown",
		});

		try {
			const xml = await ghFileToGhXml(file);
			if (requestId !== activeRequest.current) return;
			const result = ingestGhXml(xml, "file", {
				...options,
				// A valid file import uses its filename; script nicknames remain the
				// clipboard-paste fallback.
				onSingleScriptComponent: undefined,
			});
			if (result.isValid) {
				const fileName = getGhCardNameFromFileName(file.name);
				if (fileName.length > 0) {
					options?.onFilePicked?.(fileName);
				}
				setIsValidXml(true);
				setXmlData(xml);
			} else {
				setIsValidXml(false);
				setXmlError(result.errorMsg ?? "Selected GhXml is not valid");
			}
		} catch (err) {
			if (requestId !== activeRequest.current) return;
			setIsValidXml(false);
			if (err instanceof GhFileError) {
				setXmlError(err.message);
			} else {
				setXmlError(
					`Failed to read file "${file.name}": \n${
						err instanceof Error ? err.message : String(err)
					}`
				);
			}
		}
	};

	return {
		handlePasteFromClipboard,
		handlePastedText,
		handleFileSelected,
		invalidatePendingImport,
	};
}
