import TagDisplay from "./gh-card-tag-display";
import useTagFilters from "../ghcards/hooks/use-tag-filters";
import { LoadingSpinner } from "../ghcards/components/loading-spinner";

export default function GhCardTags(props: {
	tags: string[];
	useNarrow: boolean;
	tagFilters?: string[];
	editMode: boolean;
	removeTag: (tag: string, bool: boolean) => void;
}) {
	const { updateSearchParam, isPending } = useTagFilters();
	return (
		<div
			className={`flex ${props.useNarrow ? "w-[calc(100%-4.25rem)]" : "w-full"} flex-wrap items-center gap-2 pb-2`}
		>
			{props.tags.map((tag, i) => (
				<TagDisplay
					key={`tag-${i}-${tag}-${props.editMode}`}
					tag={tag}
					removeTag={props.removeTag}
					isHighlighted={props.tagFilters?.includes(tag) ?? false}
					editMode={props.editMode}
					updatePath={updateSearchParam}
				/>
			))}
			{isPending && <LoadingSpinner variant={"small"} />}
		</div>
	);
}
