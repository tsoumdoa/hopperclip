import { Clipboard } from "lucide-react";

export function PasteButton({
	isReplacement = false,
}: {
	isReplacement?: boolean;
}) {
	return (
		<div className="flex items-center justify-center gap-2">
			<Clipboard className="h-4 w-4" />
			<span className="text-sm">
				{isReplacement
					? "Paste new GhXml from Clipboard"
					: "Paste GhXml from Clipboard"}
			</span>
		</div>
	);
}
