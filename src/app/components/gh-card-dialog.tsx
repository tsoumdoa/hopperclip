import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/env";
import { Check, Clock, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export function InvalidValueDialog(props: {
	open: boolean;
	setOpen: () => void;
}) {
	return (
		<AlertDialog open={props.open} onOpenChange={props.setOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Couldn't save changes</AlertDialogTitle>
					<AlertDialogDescription>
						Names need 3–30 characters (PascalCase recommended). Descriptions
						can be up to 150 characters.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction>Keep editing</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function ShareDialog(props: {
	open: boolean;
	setOpen: () => void;
	postId: Id<"post">;
}) {
	const createShare = useMutation(api.ghCard.createShare);
	const revokeShare = useMutation(api.ghCard.revokeShare);
	const activeShares = useQuery(
		api.ghCard.getActiveSharesForPost,
		props.open ? { postId: props.postId } : "skip"
	);

	const [shareLink, setShareLink] = useState<string | null>(null);
	const [shareToken, setShareToken] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [revoking, setRevoking] = useState(false);
	const [isRevoked, setIsRevoked] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [expiryDate, setExpiryDate] = useState<string | null>(null);

	// Generate share link when dialog opens
	useEffect(() => {
		if (props.open && !isGenerating && !shareLink && !isRevoked) {
			setIsGenerating(true);
			createShare({ postId: props.postId, expiresInHours: 24 * 7 })
				.then((result) => {
					const baseUrl =
						process.env.NODE_ENV === "development"
							? "http://localhost:3000"
							: env.VITE_HOSTING_DOMAIN;
					const link = `${baseUrl}/share?token=${result.shareToken}`;
					setShareLink(link);
					setShareToken(result.shareToken);
					setExpiryDate(result.expiryDate);
					setIsGenerating(false);
				})
				.catch((err) => {
					console.error("Failed to create share:", err);
					toast.error("Failed to create share link. Please try again.");
					setShareLink(null);
					setIsGenerating(false);
				});
		}
	}, [
		props.open,
		props.postId,
		createShare,
		isGenerating,
		shareLink,
		isRevoked,
	]);

	// Handle existing active shares
	useEffect(() => {
		if (activeShares && activeShares.length > 0 && !shareLink && !isRevoked) {
			const share = activeShares[0];
			const baseUrl =
				process.env.NODE_ENV === "development"
					? "http://localhost:3000"
					: env.VITE_HOSTING_DOMAIN;
			const link = `${baseUrl}/share?token=${share.shareToken}`;
			setShareLink(link);
			setShareToken(share.shareToken);
			setExpiryDate(share.expiryDate);
		}
	}, [activeShares, shareLink, isRevoked]);

	const handleCopyClick = () => {
		if (shareLink) {
			navigator.clipboard.writeText(shareLink);
			setCopied(true);
			toast.success("Share link copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleRevokeClick = async () => {
		if (!shareToken) return;
		setRevoking(true);
		try {
			await revokeShare({ shareToken });
			setIsRevoked(true);
			setShareLink(null);
			toast.success("Share link revoked");
		} catch (err) {
			console.error("Failed to revoke share:", err);
			toast.error("Failed to revoke share link. Please try again.");
		} finally {
			setRevoking(false);
		}
	};

	const formatExpiry = (dateStr: string | null) => {
		if (!dateStr) return "";
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		return `Expires in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
	};

	return (
		<AlertDialog open={props.open} onOpenChange={props.setOpen}>
			<AlertDialogContent onClick={(e) => e.stopPropagation()}>
				<AlertDialogHeader>
					<AlertDialogTitle>Share this card</AlertDialogTitle>
					<AlertDialogDescription>
						{isRevoked
							? "The link has been revoked. Anyone who opens it will see an expired page."
							: shareLink
								? "Anyone with this link can view the graph and copy the GhXml — no account needed."
								: isGenerating
									? "Creating share link…"
									: "Failed to create share link. Please try again."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex items-center gap-2">
					<Input
						className="truncate font-mono text-xs"
						value={shareLink ?? (isGenerating ? "Generating…" : "")}
						readOnly
						onFocus={(e) => e.currentTarget.select()}
						disabled={!shareLink || isRevoked}
					/>
					{!isRevoked && shareLink && (
						<Button
							onClick={handleCopyClick}
							disabled={revoking || isGenerating}
							className="shrink-0"
						>
							{copied ? (
								<Check className="size-4" aria-hidden />
							) : (
								<Copy className="size-4" aria-hidden />
							)}
							{copied ? "Copied" : "Copy link"}
						</Button>
					)}
				</div>
				{shareLink && !isRevoked && (
					<p className="flex items-center gap-1.5 text-xs text-neutral-500">
						<Clock className="size-3.5" aria-hidden />
						{formatExpiry(expiryDate)}
					</p>
				)}
				<AlertDialogFooter className="sm:justify-between">
					{shareLink && !isRevoked ? (
						<Button
							variant="ghost"
							className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
							onClick={handleRevokeClick}
							disabled={revoking || isGenerating}
						>
							{revoking ? "Revoking…" : "Revoke link"}
						</Button>
					) : (
						<span />
					)}
					<AlertDialogCancel disabled={revoking}>Done</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
