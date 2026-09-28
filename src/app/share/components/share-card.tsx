import { SignUpButton, SignedOut } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Clock,
	Copy,
	Link2Off,
	Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeGhXmlForClipboard } from "../../utils/gh-xml";
import { GetSharedPost } from "@/types/types";
import { GhFlowView } from "../../components/gh-flow-view";
import type { GHNode } from "../../duckerweb/types/type";
import type { Edge } from "@xyflow/react";
import { cn } from "@/lib/utils";

function formatExpiry(dateStr: string) {
	const diffMs = new Date(dateStr).getTime() - Date.now();
	const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
	if (diffHours < 24) {
		return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
	}
	const diffDays = Math.ceil(diffHours / 24);
	return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}

export default function GhShareCard(props: {
	sharedPost: GetSharedPost;
	flowNodes: GHNode[];
	flowEdges: Edge[];
	flowLoading: boolean;
	flowError: string | null;
	decodedXml?: string;
}) {
	const [copied, setCopied] = useState(false);
	const copiedTimer = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

	const handleCopy = async () => {
		if (!props.decodedXml) return;
		try {
			await navigator.clipboard.writeText(
				normalizeGhXmlForClipboard(props.decodedXml)
			);
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
		}
	};

	if (!props.sharedPost) {
		return (
			<div className="bg-card flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-white/[0.08] px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
					<Link2Off className="size-5 text-neutral-400" aria-hidden />
				</div>
				<h1 className="text-xl font-semibold">This link has expired</h1>
				<p className="text-sm text-neutral-400">
					Share links last up to 7 days, and can be revoked by their owner. Ask
					for a fresh link.
				</p>
				<div className="mt-3 flex flex-wrap items-center justify-center gap-2">
					<Link
						to="/"
						className="inline-flex h-9 items-center rounded-lg bg-green-300 px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-green-200"
					>
						Go to Hopper Clip
					</Link>
					<Link
						to="/duckerweb"
						className="inline-flex h-9 items-center rounded-lg border border-white/10 px-4 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/5"
					>
						Open DuckerWeb
					</Link>
				</div>
			</div>
		);
	}

	const { post, expiryDate } = props.sharedPost;
	const tags = post.tags ?? [];
	const copyDisabled = !props.decodedXml;
	const copyPending = copyDisabled && props.flowLoading;
	const CopyIcon = copyPending ? Loader2 : copied ? Check : Copy;

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
				<div className="max-w-2xl min-w-0">
					<p className="font-mono text-[11px] tracking-[0.18em] text-green-300/80 uppercase">
						Shared snippet
					</p>
					<h1 className="mt-2 text-2xl font-semibold tracking-tight break-words md:text-4xl">
						{post.name}
					</h1>
					{post.description && (
						<p className="mt-2 text-base text-neutral-400">
							{post.description}
						</p>
					)}
					<div className="mt-4 flex flex-wrap items-center gap-2">
						{tags.map((tag) => (
							<span
								key={tag}
								className="inline-flex h-6 items-center rounded-md bg-white/[0.05] px-2 text-xs font-medium text-neutral-300 ring-1 ring-white/10 ring-inset"
							>
								{tag}
							</span>
						))}
						<span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
							<Clock className="size-3.5" aria-hidden />
							Link expires in {formatExpiry(expiryDate)}
						</span>
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
					<button
						type="button"
						onClick={() => handleCopy()}
						disabled={copyDisabled}
						className={cn(
							"inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:opacity-60",
							copied
								? "bg-green-300/15 text-green-300"
								: "bg-green-300 text-neutral-900 hover:bg-green-200"
						)}
					>
						<CopyIcon
							className={cn("size-4", copyPending && "animate-spin")}
							aria-hidden
						/>
						{copied ? "Copied" : "Copy GhXml"}
					</button>
					<p className="text-xs text-neutral-500">
						Then paste into Grasshopper with Ctrl+V
					</p>
				</div>
			</div>

			<div className="h-[65vh] min-h-96 overflow-hidden rounded-2xl border border-white/[0.08]">
				<GhFlowView
					nodes={props.flowNodes}
					edges={props.flowEdges}
					loading={props.flowLoading}
					errorMessage={props.flowError ?? undefined}
				/>
			</div>

			<SignedOut>
				<div className="bg-card flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center">
					<div>
						<p className="font-medium text-neutral-100">
							Keep your own Grasshopper snippets
						</p>
						<p className="text-sm text-neutral-500">
							Save, tag, and share definitions like this one.
						</p>
					</div>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
						>
							Get started
							<ArrowRight className="size-4" aria-hidden />
						</button>
					</SignUpButton>
				</div>
			</SignedOut>
		</div>
	);
}
