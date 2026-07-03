"use client";
import { Toggle } from "@/components/ui/toggle";
import { UserTag } from "@/types/types";
import { useEffect, useState } from "react";

export default function FilterTagDisplay(props: {
	tagFilters: string[];
	userTag: UserTag;
	setTagFilters: (tagFilters: string[]) => void;
	updatePath: (t: string, bool: boolean) => void;
}) {
	const [isChecked, setIsChecked] = useState(true);
	useEffect(() => {
		if (props.tagFilters.length === 0) {
			setIsChecked(true);
		}
		if (props.tagFilters.includes(props.userTag.tag)) {
			setIsChecked(true);
		} else {
			setIsChecked(false);
		}
	}, [props.tagFilters, props.userTag.tag]);
	return (
		<Toggle
			aria-label={`Filter by tag ${props.userTag.tag}`}
			className={`h-6 rounded-md ${props.tagFilters.length > 0 ? "bg-neutral-500 text-neutral-300 ring-0 ring-neutral-300" : "bg-neutral-800 text-neutral-100 ring-1 ring-neutral-200"} px-2 text-sm font-semibold hover:cursor-pointer hover:bg-neutral-800/80`}
			pressed={isChecked}
			onPressedChange={(bool) => {
				setIsChecked(bool);
				props.setTagFilters(
					!isChecked
						? [...props.tagFilters, props.userTag.tag]
						: props.tagFilters.filter((t) => t !== props.userTag.tag)
				);
				props.updatePath(props.userTag.tag, !isChecked);
			}}
		>
			{props.userTag.tag}
			<span
				className={`text-xs font-normal tracking-wider ${props.tagFilters.length > 0 ? "text-neutral-600" : "text-neutral-400"}`}
			>
				{`(${props.userTag.count})`}
			</span>
		</Toggle>
	);
}
