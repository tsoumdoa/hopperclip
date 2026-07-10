import { X } from "lucide-react";
import { useEffect } from "react";
import posthog from "posthog-js";
import { buildGhJson } from "parser/src/parser";
import type { ParsedGrasshopper } from "parser/src/types";
import { validateGhXml } from "../utils/gh-xml";
import { GhFileDropzone } from "./gh-file-dropzone";
import { GhFileError, ghFileToGhXml } from "../utils/gh-file";

export function sanitizeGhCardName(raw: string): string {
	return raw
		.trim()
		.replace(/[^\p{L}\p{N}]/gu, "")
		.slice(0, 30);
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

export interface IngestResult {
	isValid: boolean;
	xml?: string;
	errorMsg?: string;
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

export function GhCardXmlPaste(props: {
	xmlData: string | undefined;
	setXmlData: (data: string | undefined) => void;
	isValidXml: boolean;
	xmlError: string;
	setXmlError: (error: string) => void;
	handlePasteFromClipboard: () => void;
	handleFileSelected: (file: File) => void;
	onClearPastedXml?: () => void;
	isEditMode?: boolean;
}) {
	const { xmlData, isValidXml, setXmlError } = props;

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
				<div className="flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onClick={props.handlePasteFromClipboard}
						className="animate border-input flex-1 rounded-md border bg-neutral-100 p-2 font-medium text-neutral-500 shadow-xs transition-all hover:text-neutral-700"
					>
						{props.isEditMode
							? "Replace GhXml from Clipboard"
							: "Paste GhXml from Clipboard"}
					</button>
					<GhFileDropzone
						className="flex-1"
						onFileSelected={props.handleFileSelected}
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

interface UseXmlPasteHandlerOptions {
	onSingleScriptComponent?: (nickName: string) => void;
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
	const handlePasteFromClipboard = async () => {
		setXmlError("");
		setXmlData("");
		setIsValidXml(false);

		posthog.capture("user_pasted", { source: "clipboard" });

		try {
			const text = await navigator.clipboard.readText();
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
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	};

	const handleFileSelected = async (file: File) => {
		setXmlError("");
		setXmlData("");
		setIsValidXml(false);

		posthog.capture("user_pasted", {
			source: "file",
			ext: file.name.includes(".")
				? file.name.split(".").pop()
				: "unknown",
		});

		try {
			const xml = await ghFileToGhXml(file);
			const result = ingestGhXml(xml, "file", options);
			if (result.isValid) {
				setIsValidXml(true);
				setXmlData(xml);
			} else {
				setIsValidXml(false);
				setXmlError(result.errorMsg ?? "Selected GhXml is not valid");
			}
		} catch (err) {
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

	return { handlePasteFromClipboard, handleFileSelected };
}
