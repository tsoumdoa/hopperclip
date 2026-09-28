import { Undo2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function TagDisplay(props: {
	tag: string;
	removeTag: (tag: string, toBeRemoved: boolean) => void;
	isHighlighted: boolean;
	editMode: boolean;
	updatePath: (t: string, bool: boolean) => void;
}) {
	const [toBeRemoved, setToBeRemoved] = useState(false);
	const handleClick = () => {
		setToBeRemoved(!toBeRemoved);
		props.removeTag(props.tag, toBeRemoved);
	};

	return (
		<button
			type="button"
			key={`tag-${props.tag}`}
			aria-label={
				props.editMode
					? `${toBeRemoved ? "Keep" : "Remove"} tag ${props.tag}`
					: `Filter by tag ${props.tag}`
			}
			className={cn(
				"inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium ring-1 transition-colors ring-inset hover:cursor-pointer",
				props.isHighlighted
					? "bg-green-300/15 text-green-200 ring-green-300/30 hover:bg-green-300/25"
					: "bg-white/[0.05] text-neutral-300 ring-white/10 hover:bg-white/10 hover:text-white",
				toBeRemoved && "text-neutral-500 line-through opacity-60"
			)}
			onClick={(e) => {
				e.stopPropagation();
				if (props.editMode) {
					handleClick();
				} else {
					props.updatePath(props.tag, !props.isHighlighted);
				}
			}}
		>
			{props.tag}
			{props.editMode &&
				(toBeRemoved ? (
					<Undo2 className="size-3" aria-hidden />
				) : (
					<X className="size-3" aria-hidden />
				))}
		</button>
	);
}
