import { Plus, X } from "lucide-react";

export default function AddGHTagDisplay(props: {
	tag: string;
	handleDeleteTag: (tag: string) => void;
}) {
	return (
		<span className="bg-secondary text-secondary-foreground hover:bg-secondary/60 animate-fadeIn inline-flex h-8 w-fit cursor-default items-center rounded-sm border border-solid px-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50">
			{props.tag}
			<X
				className="ml-2 h-4 w-3 hover:cursor-pointer"
				onClick={() => {
					props.handleDeleteTag(props.tag);
				}}
			/>
		</span>
	);
}

export function AvailableGhTagDisplay(props: {
	tag: string;
	handleAddTag: (tag: string) => void;
}) {
	return (
		<span
			className="bg-primary text-primary-foreground hover:bg-primary/80 animate-fadeIn inline-flex h-8 w-fit cursor-default items-center rounded-sm px-2 text-sm transition-all hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
			onClick={() => {
				props.handleAddTag(props.tag);
			}}
		>
			{props.tag}
			<Plus className="ml-2 h-4 w-3 hover:cursor-pointer" />
		</span>
	);
}
