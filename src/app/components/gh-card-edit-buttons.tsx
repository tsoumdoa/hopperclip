import { Button } from "@/components/ui/button";
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
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="text-red-400 hover:text-red-300"
				onClick={() => setConfirmDeleteOpen(true)}
			>
				<Trash2 className="size-3.5" aria-hidden />
				Delete
			</Button>
			<div className="flex items-center gap-1.5">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => props.handleCancel()}
				>
					Cancel
				</Button>
				<Button type="button" size="sm" onClick={() => props.handleEdit(true)}>
					Save
				</Button>
			</div>
		</div>
	);
}
