import { Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import AddGHCard from "@/app/components/add-gh-card";
import GHCard from "@/app/components/gh-card";
import Header from "@/app/components/header";
import GhCardDisplay from "@/app/ghcards/components/gh-card-display";
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

function MainCardSkeleton() {
	return (
		<div className="h-ful mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
			{Array.from({ length: 12 }).map((_, i) => (
				<GHCard
					key={i}
					cardInfo={{
						_id: "" as never,
						_creationTime: 0,
						name: "Loading...",
						description: "Loading...",
						bucketUrl: "",
						clerkUserId: "",
						dateCreated: "",
						dateUpdated: "",
					}}
				/>
			))}
		</div>
	);
}

function GhcardsPage() {
	const { username } = Route.useLoaderData();
	const search = Route.useSearch();
	const sortKey = search.sort ?? "ascLastEdited";
	const sanitizedTagFilter =
		typeof search.tagFilter === "string"
			? search.tagFilter.split(",").filter(Boolean)
			: [];

	return (
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
				<Suspense fallback={<MainCardSkeleton />}>
					<GhCardDisplay tagFilters={sanitizedTagFilter} sortOrder={sortKey} />
				</Suspense>
			</div>
			<ShortcutHint />
		</div>
	);
}
