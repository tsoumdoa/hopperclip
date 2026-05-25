"use client";

import { CopiedDialog } from "@/app/components/gh-card-dialog";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { GetSharedPost } from "@/types/types";
import { GHFlowCanvas } from "../../duckerweb/components/GHFlowCanvas";
import { GitBranch, List } from "lucide-react";
import type { ViewMode } from "../../duckerweb/types/type";
import type { GHNode } from "../../duckerweb/types/type";
import type { Edge } from "@xyflow/react";

const viewTabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
	{ key: "list", label: "Card", icon: <List size={16} /> },
	{ key: "flow", label: "Flow", icon: <GitBranch size={16} /> },
];

export default function GhShareCard(props: {
	sharedPost: GetSharedPost;
	flowNodes: GHNode[];
	flowEdges: Edge[];
	flowLoading: boolean;
	flowError: string | null;
	decodedXml?: string;
	viewMode: ViewMode;
	onSetViewMode: (mode: ViewMode) => void;
}) {
	const [openCopyDialog, setOpenCopyDialog] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleCopy = async () => {
		if (!props.decodedXml) return;
		setIsLoading(true);

		try {
			await navigator.clipboard.writeText(props.decodedXml);
			setOpenCopyDialog(true);
			setIsCopied(true);
		} catch {
			setOpenCopyDialog(true);
			setIsCopied(false);
		}

		setIsLoading(false);
	};

	const formatExpiry = (dateStr: string) => {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
		if (diffHours < 24) {
			return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
		}
		const diffDays = Math.ceil(diffHours / 24);
		return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
	};

	if (!props.sharedPost) {
		return (
			<div className="flex max-h-3/5 w-full max-w-xl">
				<Card className="w-full gap-2 border-neutral-800 bg-neutral-900 p-4">
					<CardHeader className="px-0">
						<CardTitle className="text-3xl font-semibold text-white">
							Link Expired
						</CardTitle>
					</CardHeader>
					<CardContent className="px-0">
						<p className="text-neutral-400">
							This share link has expired or is invalid.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className={`flex w-full ${props.viewMode === "flow" ? "max-w-6xl" : "max-w-xl"}`}>
			<CopiedDialog
				open={openCopyDialog}
				setOpen={() => setOpenCopyDialog(false)}
				setIsCopied={(b) => setIsCopied(b)}
				isCopied={isCopied}
				decoded={props.decodedXml}
			/>
			<Card className="w-full gap-2 border-neutral-800 bg-neutral-900 p-4">
				<CardHeader className="px-0">
					<CardTitle className="flex items-center justify-between">
						<span className="text-3xl font-semibold text-white">
							Hopper Clip Share
						</span>

						<CardDescription>
							Expires in {formatExpiry(props.sharedPost.expiryDate)}
						</CardDescription>
					</CardTitle>
					<div className="flex rounded-lg border border-neutral-700 p-1">
						{viewTabs.map((tab) => (
							<button
								key={tab.key}
								onClick={() => props.onSetViewMode(tab.key)}
								className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
									props.viewMode === tab.key
										? "bg-white text-black"
										: "text-neutral-400 hover:text-white"
								}`}
							>
								{tab.icon}
								{tab.label}
							</button>
						))}
					</div>
				</CardHeader>

				{props.viewMode === "list" && (
					<CardContent className="px-0">
						<div>
							<div className="text-neutral-500">Name</div>
							<div className="pb-1 text-lg font-semibold">
								<p className="overflow-hidden text-ellipsis text-neutral-100">
									{props.sharedPost.post.name}
								</p>
							</div>
							<div className="text-neutral-500">Description</div>
							<div className="h-auto text-neutral-100">
								{props.sharedPost.post.description}
							</div>
						</div>
					</CardContent>
				)}

				{props.viewMode === "flow" && (
					<CardContent className="px-0">
						{props.flowLoading ? (
							<div className="flex h-[70vh] items-center justify-center">
								<span className="text-neutral-400">Loading flow...</span>
							</div>
						) : props.flowError ? (
							<div className="flex h-[70vh] items-center justify-center">
								<span className="text-red-400">{props.flowError}</span>
							</div>
						) : props.flowNodes.length > 0 ? (
							<div className="h-[70vh]">
								<GHFlowCanvas nodes={props.flowNodes} edges={props.flowEdges} />
							</div>
						) : (
							<div className="flex h-[70vh] items-center justify-center">
								<span className="text-neutral-400">No flow data available</span>
							</div>
						)}
					</CardContent>
				)}

				<AlertDialogFooter>
					<Button
						variant="outline"
						className="w-fit hover:opacity-80"
						onClick={() => handleCopy()}
						disabled={isLoading || !props.decodedXml}
					>
						Copy
					</Button>
				</AlertDialogFooter>
			</Card>
		</div>
	);
}
