import { Plus, X } from "lucide-react";
import { useState } from "react";

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

	const colorClasses = props.isHighlighted
		? `text-neutral-800 ${toBeRemoved ? "bg-neutral-100/30" : "bg-neutral-100"}`
		: `text-neutral-100 ${toBeRemoved ? "bg-neutral-600/30" : "bg-neutral-600"}`;

	return (
		<button
			type="button"
			key={`tag-${props.tag}`}
			aria-label={
				props.editMode
					? `${toBeRemoved ? "Keep" : "Remove"} tag ${props.tag}`
					: `Filter by tag ${props.tag}`
			}
			className={`flex flex-row items-center gap-x-2 rounded-sm px-2 text-sm font-semibold ${colorClasses} transition-all hover:cursor-pointer`}
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
			{props.editMode && <ControlIcon toBeRemoved={toBeRemoved} />}
		</button>
	);
}

function ControlIcon(props: { toBeRemoved: boolean }) {
	if (props.toBeRemoved) {
		return <Plus className="h-3 w-3" aria-hidden />;
	} else {
		return <X className="h-3 w-3" aria-hidden />;
	}
}
