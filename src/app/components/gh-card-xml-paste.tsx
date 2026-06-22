import { X } from "lucide-react";
import { useEffect } from "react";
import posthog from "posthog-js";
import { buildGhJson } from "parser/sand/src/parser";
import type { ParsedGrasshopper } from "parser/sand/src/types";
import { validateGhXml } from "../utils/gh-xml";

export function sanitizeGhCardName(raw: string): string {
	return raw.trim().replace(/[^\p{L}\p{N}]/gu, "").slice(0, 30);
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

export function GhCardXmlPaste(props: {
	xmlData: string | undefined;
	setXmlData: (data: string | undefined) => void;
	isValidXml: boolean;
	xmlError: string;
	setXmlError: (error: string) => void;
	handlePasteFromClipboard: () => void;
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
	};

	return (
		<div className="text-sm">
			{props.xmlData ? (
				<div className="space-y-2">
					{props.isValidXml ? (
						<div className="flex flex-row items-center gap-x-2">
							<button
								className={`flex flex-row items-center gap-x-1 text-sm hover:cursor-pointer ${props.isEditMode ? "text-red-20" : "text-red-500"}`}
								onClick={handleClear}
							>
								Delete pasted GhXml
								<X size={16} />
							</button>
							<span
								className={`text-sm ${props.isEditMode ? "text-green-20" : "text-green-600"} font-bold hover:cursor-default`}
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
				<button
					type="button"
					onClick={props.handlePasteFromClipboard}
					className="animate border-input rounded-md border bg-neutral-100 p-2 font-medium text-neutral-500 shadow-xs transition-all hover:text-neutral-700"
				>
					{props.isEditMode
						? "Replace GhXml from Clipboard"
						: "Paste GhXml from Clipboard"}
				</button>
			)}
			{props.xmlError.length > 0 && (
				<div
					className={`${props.isEditMode ? "text-red-20" : "text-red-500"} mt-2 text-sm font-bold`}
				>
					{props.xmlError}
				</div>
			)}
		</div>
	);
}

export function useXmlPasteHandler(
	setXmlData: (data: string | undefined) => void,
	setIsValidXml: (valid: boolean) => void,
	setXmlError: (error: string) => void,
	options?: { onSingleScriptComponent?: (nickName: string) => void }
) {
	const handlePasteFromClipboard = async () => {
		setXmlError("");
		setXmlData("");
		setIsValidXml(false);

		posthog.capture("user_pasted");

		try {
			const text = await navigator.clipboard.readText();
			if (text.length === 0) {
				setXmlError("Clipboard is empty");
				return;
			}

			const { isValid, errorMsg } = validateGhXml(text);

			if (isValid) {
				try {
					const parsed = buildGhJson(text);
					const nickName = getSingleScriptNickName(parsed);
					if (nickName) {
						options?.onSingleScriptComponent?.(nickName);
					}
				} catch {
					// Parse failure should not block a valid XML paste.
				}
				setIsValidXml(true);
				setXmlData(text);
			} else {
				setIsValidXml(false);
				setXmlError("Pasted GhXml is not valid: \n" + errorMsg);
			}
		} catch (err) {
			setXmlError("Failed to read clipboard contents: \n" + String(err));
		}
	};

	return { handlePasteFromClipboard };
}
