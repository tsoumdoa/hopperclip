import { Suspense, type ReactNode } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import AddGHCard from "@/app/components/add-gh-card";
import { GhPageFileDropLayer } from "@/app/components/gh-page-file-drop-layer";
import {
	GhCardsPageProvider,
	useGhCardsPageActions,
	useGhCardsPageState,
} from "@/app/ghcards/contexts/gh-cards-page-context";
import { Search } from "lucide-react";
import { PageShell } from "@/app/components/page-shell";
import { useModifierKeyLabel } from "@/app/hooks/use-modifier-key-label";
import { Kbd } from "@/components/ui/kbd";
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
	return (
		<GhCardsPageProvider>
			<GhcardsPageContent />
		</GhCardsPageProvider>
	);
}

function GhcardsPageContent() {
	const { username } = Route.useLoaderData();
	const search = Route.useSearch();
	const sortKey = search.sort ?? "ascLastEdited";
	const sanitizedTagFilter =
		typeof search.tagFilter === "string"
			? search.tagFilter.split(",").filter(Boolean)
			: [];
	return (
		<GhCardsPageDropLayer>
			<PageShell footer={false} className="pb-24">
				<div className="flex flex-col gap-4 pt-4 pb-5 md:flex-row md:items-end md:justify-between">
					<div className="min-w-0">
						<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
							Library
						</h1>
						<p className="mt-1 truncate text-sm text-neutral-500">
							{username
								? `${username}'s Grasshopper snippets`
								: "Your Grasshopper snippets"}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<SearchButton />
						<SortDropDown />
						<AddGHCard />
					</div>
				</div>
				<div className="pb-5">
					<UserTags tagFilters={sanitizedTagFilter} />
				</div>
				<Suspense fallback={<GhCardGridSkeleton />}>
					<GhCardDisplay tagFilters={sanitizedTagFilter} sortOrder={sortKey} />
				</Suspense>
			</PageShell>
			<ShortcutHint />
		</GhCardsPageDropLayer>
	);
}

function SearchButton() {
	const { setSearchOpen } = useGhCardsPageActions();
	const mod = useModifierKeyLabel();
	return (
		<button
			type="button"
			onClick={() => setSearchOpen(true)}
			aria-label="Search cards"
			className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-neutral-500 transition-colors hover:border-white/20 hover:text-neutral-300 md:w-64 md:flex-none"
		>
			<Search className="size-4 shrink-0" aria-hidden />
			<span className="flex-1 text-left">Search…</span>
			<span className="hidden items-center gap-0.5 sm:flex">
				<Kbd>{mod}</Kbd>
				<Kbd>K</Kbd>
			</span>
		</button>
	);
}

function GhCardsPageDropLayer({ children }: { children: ReactNode }) {
	const { addDialogOpen, hasEditingCards } = useGhCardsPageState();
	const { openAddDialog } = useGhCardsPageActions();

	return (
		<GhPageFileDropLayer
			enabled={!addDialogOpen && !hasEditingCards}
			onGhFileDrop={openAddDialog}
		>
			{children}
		</GhPageFileDropLayer>
	);
}
