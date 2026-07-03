import { useState } from "react";
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
		<div className="flex items-center justify-end text-neutral-400 transition-all">
			<AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this card?</AlertDialogTitle>
						<AlertDialogDescription>
							{`"${props.ghInfo.name}" and its GhXml will be permanently deleted. This cannot be undone.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 text-white hover:bg-red-700"
							onClick={() => props.deletePost()}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<button
				className={`px-2 font-bold hover:text-neutral-50`}
				onClick={() => setConfirmDeleteOpen(true)}
			>
				delete
			</button>
			<button
				className={`px-2 font-bold hover:text-neutral-50`}
				onClick={() => props.handleCancel()}
			>
				cancel
			</button>
			<button
				className={`px-2 font-bold hover:text-neutral-50`}
				onClick={() => props.handleEdit(true)}
			>
				save
			</button>
		</div>
	);
}
