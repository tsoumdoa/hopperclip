import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { GhCard } from "@/types/types";

export function EditButtons(props: {
	editMode: boolean;
	setEditMode: (b: boolean) => void;
	setGhInfo: (ghInfo: GhCard) => void;
	handleEdit: (b: boolean) => void;
	handleCancel: () => void;
	deletePost: () => void;
	ghInfo: GhCard;
}) {
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	return (
		<div className="flex w-full items-center justify-between">
			<AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this card?</AlertDialogTitle>
						<AlertDialogDescription>
							{`"${props.ghInfo.name}" and its GhXml will be permanently deleted. Any active share link will stop working. This cannot be undone.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 text-white hover:bg-red-500"
							onClick={() => props.deletePost()}
						>
							Delete card
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<button
				type="button"
				className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
				onClick={() => setConfirmDeleteOpen(true)}
			>
				<Trash2 className="size-3.5" aria-hidden />
				Delete
			</button>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					className="h-8 rounded-md px-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
					onClick={() => props.handleCancel()}
				>
					Cancel
				</button>
				<button
					type="button"
					className="h-8 rounded-md bg-green-300 px-3.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-green-200"
					onClick={() => props.handleEdit(true)}
				>
					Save
				</button>
			</div>
		</div>
	);
}
