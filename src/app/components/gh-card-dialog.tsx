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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
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

type ShareDialogProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	postId: Id<"post">;
};

type ShareState =
	| { status: "loading" | "error" | "revoked" }
	| { status: "ready"; shareToken: string; expiryDate: string };

export function ShareDialog(props: ShareDialogProps) {
	return (
		<AlertDialog open={props.open} onOpenChange={props.setOpen}>
			{props.open && (
				<ShareDialogContent key={props.postId} postId={props.postId} />
			)}
		</AlertDialog>
	);
}

function ShareDialogContent({ postId }: Pick<ShareDialogProps, "postId">) {
	const createShare = useMutation(api.ghCard.createShare);
	const revokeShare = useMutation(api.ghCard.revokeShare);
	const [share, setShare] = useState<ShareState>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);
	const [copied, setCopied] = useState(false);
	const [revoking, setRevoking] = useState(false);
	const copiedTimer = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

	useEffect(() => {
		let cancelled = false;
		// createShare already returns an existing active link when there is one.
		void createShare({ postId, expiresInHours: 24 * 7 }).then(
			(result) => {
				if (!cancelled) setShare({ status: "ready", ...result });
			},
			() => {
				if (cancelled) return;
				setShare({ status: "error" });
				toast.error("Failed to create share link. Please try again.");
			}
		);
		return () => {
			cancelled = true;
		};
	}, [postId, createShare, attempt]);

	const isGenerating = share.status === "loading";
	const isRevoked = share.status === "revoked";
	const expiryDate = share.status === "ready" ? share.expiryDate : null;
	const baseUrl =
		process.env.NODE_ENV === "development"
			? window.location.origin
			: env.VITE_HOSTING_DOMAIN;
	const shareLink =
		share.status === "ready"
			? `${baseUrl}/share?token=${share.shareToken}`
			: null;

	const handleCopyClick = async () => {
		if (!shareLink) return;
		try {
			await navigator.clipboard.writeText(shareLink);
			setCopied(true);
			toast.success("Share link copied to clipboard");
			window.clearTimeout(copiedTimer.current);
			copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy share link. Please try again.");
		}
	};

	const handleRevokeClick = async () => {
		if (share.status !== "ready") return;
		setRevoking(true);
		try {
			await revokeShare({ shareToken: share.shareToken });
			setShare({ status: "revoked" });
			toast.success("Share link revoked");
		} catch {
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
		<AlertDialogContent
			onClick={(e) => e.stopPropagation()}
			onEscapeKeyDown={(event) => {
				if (revoking) event.preventDefault();
			}}
		>
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
				) : share.status === "error" ? (
					<Button
						onClick={() => {
							setShare({ status: "loading" });
							setAttempt((current) => current + 1);
						}}
					>
						Retry
					</Button>
				) : (
					<span />
				)}
				<AlertDialogCancel disabled={revoking}>Done</AlertDialogCancel>
			</AlertDialogFooter>
		</AlertDialogContent>
	);
}
