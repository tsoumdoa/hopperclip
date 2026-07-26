import { useState } from "react";
import { toast } from "sonner";
import { useFetchGhXml } from "../hooks/use-fetch-gh-xml";
import { ShareDialog } from "./gh-card-dialog";
import { Id } from "../../../convex/_generated/dataModel";
import { normalizeGhXmlForClipboard } from "@/lib/gh/xml";

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
	const { downloadData } = useFetchGhXml();

	const handleCopy = async () => {
		setIsLoading(true);
		try {
			const decoded = await downloadData(props.bucketId);
			await navigator.clipboard.writeText(normalizeGhXmlForClipboard(decoded));
			toast.success("GhXml copied to clipboard");
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

	return (
		<div className="flex items-center justify-end text-neutral-400 transition-all">
			<ShareDialog
				open={props.openSharedDialog}
				setOpen={() => props.setOpenSharedDialog(!props.openSharedDialog)}
				postId={props.postId}
			/>
			<button
				className={`px-2 font-bold hover:text-neutral-50`}
				onClick={handleCopy}
				disabled={isLoading}
			>
				{isLoading ? "Loading..." : "copy"}
			</button>
			<button
				className={`px-2 font-bold hover:text-neutral-50`}
				onClick={props.handleShare}
			>
				share
			</button>
			<button
				className={`px-2 font-bold hover:text-neutral-50`}
				onClick={() => props.setEditMode()}
			>
				edit
			</button>
		</div>
	);
}
