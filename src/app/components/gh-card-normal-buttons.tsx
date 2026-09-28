import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Loader2, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useFetchGhXml } from "../hooks/use-fetch-gh-xml";
import { ShareDialog } from "./gh-card-dialog";
import { Id } from "../../../convex/_generated/dataModel";
import { normalizeGhXmlForClipboard } from "../utils/gh-xml";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function NormalButtons(props: {
	editMode: boolean;
	bucketId: string;
	postId: Id<"post">;
	setEditMode: () => void;
	handleEdit: (b: boolean) => void;
	openSharedDialog: boolean;
	setOpenSharedDialog: (b: boolean) => void;
	handleShare: () => void;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const copiedTimer = useRef<number | undefined>(undefined);
	const { downloadData } = useFetchGhXml();

	useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

	const handleCopy = async () => {
		setIsLoading(true);
		try {
			const decoded = await downloadData(props.bucketId);
			await navigator.clipboard.writeText(normalizeGhXmlForClipboard(decoded));
			toast.success("Copied — paste into Grasshopper with Ctrl+V");
			setCopied(true);
			window.clearTimeout(copiedTimer.current);
			copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy GhXml", {
				action: {
					label: "Retry",
					onClick: () => handleCopy(),
				},
			});
		} finally {
			setIsLoading(false);
		}
	};

	const CopyIcon = isLoading ? Loader2 : copied ? Check : Copy;

	return (
		<div className="flex items-center gap-0.5">
			<ShareDialog
				open={props.openSharedDialog}
				setOpen={() => props.setOpenSharedDialog(!props.openSharedDialog)}
				postId={props.postId}
			/>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className={cn(
							"mr-1 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
							copied
								? "bg-green-300/15 text-green-300"
								: "bg-white/[0.07] text-neutral-100 hover:bg-green-300 hover:text-neutral-900"
						)}
						onClick={handleCopy}
						disabled={isLoading}
					>
						<CopyIcon
							className={cn("size-3.5", isLoading && "animate-spin")}
							aria-hidden
						/>
						{copied ? "Copied" : "Copy"}
					</button>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					Copy GhXml, then paste into Grasshopper
				</TooltipContent>
			</Tooltip>
			<CardIconButton label="Share" icon={Link2} onClick={props.handleShare} />
			<CardIconButton
				label="Edit"
				icon={Pencil}
				onClick={() => props.setEditMode()}
			/>
		</div>
	);
}

function CardIconButton(props: {
	label: string;
	icon: LucideIcon;
	onClick: () => void;
}) {
	const Icon = props.icon;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={props.label}
					className="inline-flex size-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
					onClick={props.onClick}
				>
					<Icon className="size-3.5" aria-hidden />
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{props.label}</TooltipContent>
		</Tooltip>
	);
}
