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
import { useEffect, useState } from "react";
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
					<AlertDialogTitle>Invalid Input</AlertDialogTitle>
					<AlertDialogDescription>
						Name must be between 3 and 30 characters long and in PascalCase.
						Description must be between 1 and 150 characters long.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction>Continue</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function CopiedDialog(props: {
	open: boolean;
	setOpen: () => void;
	setIsCopied: (b: boolean) => void;
	isCopied: boolean;
	decoded: string | undefined;
}) {
	function handleCopyClick() {
		navigator.clipboard.writeText(props.decoded!);
		props.setIsCopied(true);
		alert("GhXml copied to clipboard!");
	}

	return (
		<AlertDialog open={props.open} onOpenChange={props.setOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{props.isCopied ? "Copied!" : "Failed to copy"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{props.isCopied
							? "copied to your clipboard!"
							: "Something went wrong, try copy button below"}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					{!props.isCopied && (
						<Button
							className="bg-neutral-800 hover:bg-neutral-700"
							onClick={handleCopyClick}
						>
							Copy
						</Button>
					)}
					<AlertDialogCancel>Close</AlertDialogCancel>
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
		} catch (err) {
			console.error("Failed to revoke share:", err);
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
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Share</AlertDialogTitle>
					<AlertDialogDescription>
						{isRevoked
							? "Share link has been revoked. You can now close this dialog."
							: shareLink
								? "Copy the link to share this card with others!"
								: isGenerating
									? "Creating share link..."
									: "Failed to create share link. Please try again."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex items-center space-x-2 pb-2">
					<Input
						className="truncate"
						value={shareLink ?? (isGenerating ? "Generating..." : "")}
						readOnly
						disabled={!shareLink || isRevoked}
					/>
					{!isRevoked && shareLink && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopyClick}
							disabled={revoking || isGenerating}
						>
							{copied ? "Copied!" : "Copy"}
						</Button>
					)}
				</div>
				{shareLink && !isRevoked && (
					<p className="text-xs text-neutral-400">{formatExpiry(expiryDate)}</p>
				)}
				<AlertDialogFooter>
					{shareLink && !isRevoked && (
						<Button
							className="bg-pink-500 hover:bg-pink-600"
							onClick={handleRevokeClick}
							disabled={revoking || isGenerating}
						>
							{revoking ? "Revoking..." : "Revoke"}
						</Button>
					)}
					<AlertDialogAction disabled={revoking}>Close</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
