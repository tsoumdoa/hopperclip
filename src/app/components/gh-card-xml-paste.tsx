import { Clipboard, FileUp, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { validateGhXml } from "../utils/gh-xml";
import { GhFileError, ghFileToGhXml } from "../utils/gh-file";
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

	const linkClass = cn(
		"inline-flex items-center gap-1.5 text-sm transition-colors",
		props.isEditMode
			? "text-neutral-900 hover:text-black"
			: "text-neutral-500 hover:text-neutral-800"
	);

	const hintClass = cn(
		"text-xs",
		props.isEditMode ? "text-neutral-800" : "text-neutral-400"
	);

	return (
		<div className="text-sm">
			{props.xmlData ? (
				<div className="space-y-2">
					{props.isValidXml ? (
						<div className="flex flex-row items-center gap-x-2">
							<button
								className={`flex flex-row items-center gap-x-1 text-sm hover:cursor-pointer ${props.isEditMode ? "text-red-200" : "text-red-500"}`}
								onClick={handleClear}
							>
								Delete pasted GhXml
								<X size={16} />
							</button>
							<span
								className={`text-sm ${props.isEditMode ? "text-green-200" : "text-green-600"} font-bold hover:cursor-default`}
							>
								{props.isEditMode
									? "✓ New GhXml validated"
									: "✓ GhXml validated"}
							</span>
						</div>
					) : (
						<div className="flex flex-row items-center gap-x-2">
							<button
								className="flex flex-row items-center gap-x-1 text-sm text-red-500"
								onClick={handleClear}
							>
								Delete invalid GhXml
								<X size={16} />
							</button>
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={props.handlePasteFromClipboard}
							className={linkClass}
						>
							<Clipboard className="h-3.5 w-3.5" />
							<span>Paste</span>
						</button>
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className={linkClass}
							data-testid="gh-file-browse-button"
						>
							<FileUp className="h-3.5 w-3.5" />
							<span>Browse</span>
						</button>
					</div>
					<p className={hintClass}>or drop a file</p>
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
				<div
					className={`${props.isEditMode ? "text-red-200" : "text-red-500"} mt-2 text-sm font-bold`}
				>
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

	const handlePasteFromClipboard = async () => {
		const requestId = ++activeRequest.current;
		setXmlError("");
		setXmlData("");
		setIsValidXml(false);

		posthog.capture("user_pasted", { source: "clipboard" });

		try {
			const text = await navigator.clipboard.readText();
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
		handleFileSelected,
		invalidatePendingImport,
	};
}
