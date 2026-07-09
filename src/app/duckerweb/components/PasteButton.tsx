import { Clipboard } from "lucide-react";

export function PasteButton() {
	return (
		<div className="flex items-center justify-center gap-2">
			<Clipboard className="h-4 w-4" />
			<span className="text-sm">Paste GhXml from Clipboard</span>
		</div>
	);
}
