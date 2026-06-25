"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddGhDialog } from "./add-gh-dialog";

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
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
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
