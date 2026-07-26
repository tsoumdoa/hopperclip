import { useEffect } from "react";
import { validateGhXml } from "./xml";

type NativeGhXmlPasteDecision = {
	enabled: boolean;
	text: string;
	editableTarget: boolean;
	allowValidGhXmlInEditable?: boolean;
};

type UseNativeGhXmlPasteOptions = {
	enabled: boolean;
	onPasteText: (text: string) => void;
	allowValidGhXmlInEditable?: boolean;
};

export function shouldConsumeNativeGhXmlPaste({
	enabled,
	text,
	editableTarget,
	allowValidGhXmlInEditable = false,
}: NativeGhXmlPasteDecision): boolean {
	if (!enabled) return false;
	if (!editableTarget) return true;
	return allowValidGhXmlInEditable && validateGhXml(text).isValid;
}

function isEditablePasteTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement
		? target.matches("input, textarea, select") || target.isContentEditable
		: false;
}

/**
 * Consumes an explicit browser paste gesture without requesting programmatic
 * clipboard access. Editable fields keep their native paste behavior unless
 * the caller opts into importing valid GhXml from them.
 */
export function useNativeGhXmlPaste({
	enabled,
	onPasteText,
	allowValidGhXmlInEditable = false,
}: UseNativeGhXmlPasteOptions) {
	useEffect(() => {
		if (!enabled) return;

		const handlePaste = (event: ClipboardEvent) => {
			if (!event.clipboardData) return;

			const text = event.clipboardData.getData("text/plain");
			const shouldConsume = shouldConsumeNativeGhXmlPaste({
				enabled,
				text,
				editableTarget: isEditablePasteTarget(event.target),
				allowValidGhXmlInEditable,
			});

			if (!shouldConsume) return;
			event.preventDefault();
			onPasteText(text);
		};

		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [allowValidGhXmlInEditable, enabled, onPasteText]);
}
