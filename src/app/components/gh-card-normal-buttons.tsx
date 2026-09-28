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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NormalButtons(props: {
	bucketId: string;
	postId: Id<"post">;
	setEditMode: () => void;
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
				setOpen={props.setOpenSharedDialog}
				postId={props.postId}
			/>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className={cn(
							"mr-1 h-7 text-xs font-semibold",
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
					</Button>
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
				<Button
					type="button"
					aria-label={props.label}
					variant="ghost"
					size="icon"
					className="size-7 text-neutral-400 hover:text-white"
					onClick={props.onClick}
				>
					<Icon className="size-3.5" aria-hidden />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{props.label}</TooltipContent>
		</Tooltip>
	);
}
