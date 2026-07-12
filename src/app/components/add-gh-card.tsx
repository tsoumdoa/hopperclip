"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	useGhCardsPageActions,
	useGhCardsPageState,
} from "@/app/ghcards/contexts/gh-cards-page-context";
import { AddGhDialog } from "./add-gh-dialog";

export default function AddGHCard() {
	const navigate = useNavigate();
	const [adding, setAdding] = useState(false);
	const { addDialogOpen, pendingFile } = useGhCardsPageState();
	const { setAddDialogOpen, consumePendingFile } = useGhCardsPageActions();

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
			/>
			<button
				className="h-8 rounded-md bg-black px-3 py-1 text-sm font-bold ring-2 ring-neutral-300 transition-all hover:translate-x-0.5 hover:translate-y-0.5"
				onClick={handleAddClick}
			>
				{adding ? "Adding..." : "Add"}
			</button>
		</div>
	);
}
