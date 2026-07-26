import { useState, useCallback } from "react";
import type { ParsedGrasshopper } from "parser/src/types";

function formatComponentsAsMarkdown(parsedData: ParsedGrasshopper): string {
	const components = Object.values(parsedData.components);
	let text = "";

	if (parsedData.metadata?.libraries?.length) {
		text += `Libraries: ${parsedData.metadata.libraries.map((l) => l.name).join(", ")}\n\n---\n\n`;
	}

	for (const comp of components) {
		text += `## ${comp.nickName}\n`;
		text += `Type: ${comp.type}\n`;
		if (comp.description) {
			text += `${comp.description}\n`;
		}

		const inputs = Object.values(comp.inputs);
		if (inputs.length > 0) {
			text += `\nInputs:\n`;
			for (const input of inputs) {
				text += `- ${input.nick}`;
				if (input.description) {
					text += `: ${input.description}`;
				}
				text += `\n`;
			}
		}

		const outputs = Object.values(comp.outputs);
		if (outputs.length > 0) {
			text += `\nOutputs:\n`;
			for (const output of outputs) {
				text += `- ${output.nick}`;
				if (output.description) {
					text += `: ${output.description}`;
				}
				text += `\n`;
			}
		}

		text += "\n---\n\n";
	}

	return text;
}

export function useMarkdownExport(parsedData: ParsedGrasshopper | null): {
	handleCopyAll: () => void;
	isCopied: boolean;
} {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopyAll = useCallback(() => {
		if (!parsedData) return;

		const text = formatComponentsAsMarkdown(parsedData);

		navigator.clipboard.writeText(text).then(() => {
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		});
	}, [parsedData]);

	return { handleCopyAll, isCopied };
}
