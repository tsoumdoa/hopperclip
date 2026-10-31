import { Toggle } from "@/components/ui/toggle";
import { UserTag } from "@/types/types";

export default function FilterTagDisplay(props: {
	tagFilters: string[];
	userTag: UserTag;
	updatePath: (t: string, bool: boolean) => void;
}) {
	const pressed = props.tagFilters.includes(props.userTag.tag);
	return (
		<Toggle
			aria-label={`Filter by tag ${props.userTag.tag}`}
			className="h-7 min-w-0 gap-1.5 rounded-full bg-transparent px-3 text-xs font-medium text-neutral-400 ring-1 ring-white/10 ring-inset hover:cursor-pointer hover:bg-white/5 hover:text-neutral-100 data-[state=on]:bg-green-300/15 data-[state=on]:text-green-200 data-[state=on]:ring-green-300/40 data-[state=on]:hover:bg-green-300/20"
			pressed={pressed}
			onPressedChange={() => props.updatePath(props.userTag.tag, !pressed)}
		>
			{props.userTag.tag}
			<span className="text-[11px] text-neutral-500 tabular-nums">
				{props.userTag.count}
			</span>
		</Toggle>
	);
}
