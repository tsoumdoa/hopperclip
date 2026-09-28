import { formatTimeDiff } from "../utils/date-format";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const fullDateFormat: Intl.DateTimeFormatOptions = {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
};

export function DateDisplay(props: {
	createdDate: string | undefined;
	lastModDate: string | undefined;
}) {
	const isUnedited = props.lastModDate === props.createdDate;
	const created = new Date(props.createdDate || "");
	const lastMod = new Date(props.lastModDate || "");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<p className="w-fit text-xs text-neutral-500 hover:cursor-help">
					{isUnedited ? "Created " : "Edited "}
					<span className="text-neutral-400">
						{formatTimeDiff(isUnedited ? created : lastMod)}
					</span>
				</p>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p>Created {created.toLocaleString("en-US", fullDateFormat)}</p>
				{!isUnedited && (
					<p>Last edited {lastMod.toLocaleString("en-US", fullDateFormat)}</p>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
