import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
	useGhCardsPageActions,
	useGhCardsPageState,
} from "@/app/ghcards/contexts/gh-cards-page-context";
import { useNativeGhXmlPaste } from "@/app/hooks/use-native-gh-xml-paste";
import { AddGhDialog } from "./add-gh-dialog";

export default function AddGHCard() {
	const navigate = useNavigate();
	const [adding, setAdding] = useState(false);
	const { addDialogOpen, pendingFile, pendingXml, hasEditingCards } =
		useGhCardsPageState();
	const {
		setAddDialogOpen,
		openAddDialogFromPaste,
		consumePendingFile,
		consumePendingXml,
	} = useGhCardsPageActions();

	useNativeGhXmlPaste({
		enabled: !addDialogOpen && !hasEditingCards,
		onPasteText: openAddDialogFromPaste,
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === "a"
			) {
				e.preventDefault();
				setAddDialogOpen((previous) => !previous);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [setAddDialogOpen]);

	const handleAddClick = () => {
		setAddDialogOpen((previous) => !previous);
		navigate({
			to: "/ghcards",
			search: (prev) => ({
				...prev,
				tagFilterIsStale: "true",
			}),
			replace: true,
		});
	};

	return (
		<div>
			<AddGhDialog
				open={addDialogOpen}
				setOpen={setAddDialogOpen}
				setAdding={(b) => setAdding(b)}
				adding={adding}
				initialFile={pendingFile}
				onInitialFileConsumed={consumePendingFile}
				initialXml={pendingXml}
				onInitialXmlConsumed={consumePendingXml}
			/>
			<button
				type="button"
				className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-green-300 px-3.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-green-200 disabled:opacity-60"
				onClick={handleAddClick}
				disabled={adding}
			>
				{adding ? (
					<Loader2 className="size-4 animate-spin" aria-hidden />
				) : (
					<Plus className="size-4" strokeWidth={2.5} aria-hidden />
				)}
				{adding ? "Adding…" : "New card"}
			</button>
		</div>
	);
}
