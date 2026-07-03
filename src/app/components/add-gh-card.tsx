"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddGhDialog } from "./add-gh-dialog";

// Lets other components (e.g. the empty-library CTA) open the add dialog.
export const OPEN_ADD_DIALOG_EVENT = "hopperclip:open-add-dialog";

export default function AddGHCard() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [adding, setAdding] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === "a"
			) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		const handleOpenRequest = () => setOpen(true);
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener(OPEN_ADD_DIALOG_EVENT, handleOpenRequest);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener(OPEN_ADD_DIALOG_EVENT, handleOpenRequest);
		};
	}, []);

	const handleAddClick = () => {
		setOpen(!open);
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
				open={open}
				setOpen={(b) => setOpen(b)}
				setAdding={(b) => setAdding(b)}
				adding={adding}
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
