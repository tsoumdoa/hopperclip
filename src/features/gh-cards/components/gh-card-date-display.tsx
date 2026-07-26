import { formatTimeDiff } from "@/lib/date-format";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function DateDisplay(props: {
	createdDate: string | undefined;
	lastModDate: string | undefined;
}) {
	return (
		<div className="w-fit text-xs text-neutral-500">
			{props.lastModDate === props.createdDate ? (
				<div>
					Created
					<DateTooltip
						createdDate={props.createdDate}
						lastModDate={props.lastModDate}
						showType="created"
					/>
				</div>
			) : (
				<div>
					Last edited
					<DateTooltip
						createdDate={props.createdDate}
						lastModDate={props.lastModDate}
						showType="lastEdited"
					/>
				</div>
			)}
		</div>
	);
}

function DateTooltip(props: {
	createdDate: string | undefined;
	lastModDate: string | undefined;
	showType: "created" | "lastEdited";
}) {
	const createdFullDate = new Date(props.createdDate || "").toLocaleString(
		"en-US",
		{
			day: "numeric",
			month: "short",
			year: "numeric",
		}
	);
	const lastModFullDate = new Date(props.lastModDate || "").toLocaleString(
		"en-US",
		{
			day: "numeric",
			month: "short",
			year: "numeric",
		}
	);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<p className="w-fit font-bold text-neutral-200 hover:cursor-help">
					{formatTimeDiff(
						new Date(
							props.showType === "created"
								? props.createdDate || ""
								: props.lastModDate || ""
						)
					)}
				</p>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				{createdFullDate === lastModFullDate ? (
					<p>Created on: {createdFullDate}</p>
				) : (
					<>
						<p>Created on: {createdFullDate}</p>
						<p>Last modified on: {lastModFullDate}</p>
					</>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
