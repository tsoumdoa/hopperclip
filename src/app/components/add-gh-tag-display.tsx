import { Plus, X } from "lucide-react";

export default function AddGHTagDisplay(props: {
	tag: string;
	handleDeleteTag: (tag: string) => void;
}) {
	return (
		<span className="animate-fadeIn inline-flex h-7 w-fit items-center gap-1 rounded-md bg-white/[0.06] pr-1 pl-2.5 text-xs font-medium text-neutral-200 ring-1 ring-white/10 ring-inset">
			{props.tag}
			<button
				type="button"
				aria-label={`Remove tag ${props.tag}`}
				className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
				onClick={() => {
					props.handleDeleteTag(props.tag);
				}}
			>
				<X className="size-3" aria-hidden />
			</button>
		</span>
	);
}

export function AvailableGhTagDisplay(props: {
	tag: string;
	handleAddTag: (tag: string) => void;
}) {
	return (
		<button
			type="button"
			className="animate-fadeIn inline-flex h-7 w-fit items-center gap-1 rounded-md border border-dashed border-white/15 px-2.5 text-xs text-neutral-400 transition-colors hover:border-green-300/40 hover:text-green-200"
			onClick={() => {
				props.handleAddTag(props.tag);
			}}
		>
			<Plus className="size-3" aria-hidden />
			{props.tag}
		</button>
	);
}
