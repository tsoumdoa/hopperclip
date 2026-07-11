"use client";

import { Suspense, useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import AddGHCard, {
	ADD_DIALOG_STATE_EVENT,
	openAddGhDialog,
	type AddDialogStateEventDetail,
} from "@/app/components/add-gh-card";
import { GhPageFileDropLayer } from "@/app/components/gh-page-file-drop-layer";
import Header from "@/app/components/header";
import GhCardDisplay from "@/app/ghcards/components/gh-card-display";
import { GhCardGridSkeleton } from "@/app/ghcards/components/gh-card-skeleton";
import { ShortcutHint } from "@/app/ghcards/components/shortcut-hint";
import SortDropDown from "@/app/ghcards/components/sort-drop-down";
import UserTags from "@/app/ghcards/components/user-tags";
import { fetchGhcardsUser } from "@/server/r2-storage";
import { SortOrderZenum } from "@/types/types";

const ghcardsSearchSchema = z.object({
	sort: SortOrderZenum.optional().catch("ascLastEdited"),
	tagFilter: z.union([z.string(), z.array(z.string())]).optional(),
	tagFilterIsStale: z.string().optional(),
});

export const Route = createFileRoute("/_authed/ghcards")({
	validateSearch: ghcardsSearchSchema,
	beforeLoad: ({ search }) => {
		if (Array.isArray(search.tagFilter)) {
			throw redirect({ to: "/ghcards" });
		}
	},
	loader: async () => fetchGhcardsUser(),
	component: GhcardsPage,
});

function GhcardsPage() {
	const { username } = Route.useLoaderData();
	const search = Route.useSearch();
	const sortKey = search.sort ?? "ascLastEdited";
	const sanitizedTagFilter =
		typeof search.tagFilter === "string"
			? search.tagFilter.split(",").filter(Boolean)
			: [];
	const [addDialogOpen, setAddDialogOpen] = useState(false);

	useEffect(() => {
		const handleDialogState = (e: Event) => {
			const detail = (e as CustomEvent<AddDialogStateEventDetail>).detail;
			setAddDialogOpen(detail.open);
		};
		window.addEventListener(ADD_DIALOG_STATE_EVENT, handleDialogState);
		return () => {
			window.removeEventListener(ADD_DIALOG_STATE_EVENT, handleDialogState);
		};
	}, []);

	return (
		<GhPageFileDropLayer
			enabled={!addDialogOpen}
			onGhFileDrop={(file) => openAddGhDialog({ file })}
		>
			<div className="min-h-screen bg-black p-4 font-sans text-white md:p-6">
				<div className="mx-auto max-w-400">
					<Header />
					<div className="flex flex-col items-start justify-between gap-2 pb-4 sm:flex-row sm:items-center sm:gap-4">
						<div className="flex items-center gap-2 text-lg font-medium">
							<span>{`${username}'s Fav`}</span>
						</div>
						<div className="flex items-center gap-4">
							<SortDropDown />
							<AddGHCard />
						</div>
					</div>
					<div className="flex flex-row flex-wrap items-start justify-start gap-2 pb-4">
						<UserTags tagFilters={sanitizedTagFilter} />
					</div>
					<Suspense fallback={<GhCardGridSkeleton />}>
						<GhCardDisplay tagFilters={sanitizedTagFilter} sortOrder={sortKey} />
					</Suspense>
				</div>
				<ShortcutHint />
			</div>
		</GhPageFileDropLayer>
	);
}
