import { Button } from "@/components/ui/button";
import GHCard from "@/app/components/gh-card";
import {
	useGhCardsPageActions,
	useGhCardsPageState,
} from "@/app/ghcards/contexts/gh-cards-page-context";
import useFilter from "../hooks/use-filter";
import Filter from "./filter";
import { FileUp, Plus, SearchX, Tags, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api as convex } from "../../../../convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteScroll } from "../hooks/use-infinite-scroll";
import { SortOrder } from "@/types/types";
import useTagFilters from "../hooks/use-tag-filters";
import {
	cardGridClass,
	GhCardGridSkeleton,
	GhCardSkeleton,
} from "./gh-card-skeleton";
import { useModifierKeyLabel } from "@/app/hooks/use-modifier-key-label";
import { Kbd } from "@/components/ui/kbd";

const PAGE_SIZE = 24;

function EmptyState(props: {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: { label: string; onClick: () => void; primary?: boolean };
	children?: React.ReactNode;
}) {
	const Icon = props.icon;
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 px-6 py-20 text-center">
			<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
				<Icon className="size-5 text-neutral-400" aria-hidden />
			</div>
			<p className="text-lg font-semibold text-neutral-100">{props.title}</p>
			<p className="max-w-md text-sm text-neutral-500">{props.description}</p>
			{props.action && (
				<Button
					type="button"
					variant={props.action.primary ? "default" : "outline"}
					className="mt-2"
					onClick={props.action.onClick}
				>
					{props.action.primary && (
						<Plus className="size-4" strokeWidth={2.5} aria-hidden />
					)}
					{props.action.label}
				</Button>
			)}
			{props.children}
		</div>
	);
}

export default function GHCardDisplay(props: {
	tagFilters?: string[];
	sortOrder: SortOrder;
}) {
	const { openAddDialog, setSearchOpen } = useGhCardsPageActions();
	const { searchOpen } = useGhCardsPageState();
	const mod = useModifierKeyLabel();
	const [filterKeyword, setFilterKeyword] = useState("");
	const [visible, setVisible] = useState(PAGE_SIZE);
	const hasSearchKeyword = filterKeyword.length > 0;
	const args = { tags: props.tagFilters, sortOrder: props.sortOrder };
	const ghCards = useQuery(
		convex.ghCard.getAll,
		hasSearchKeyword ? args : "skip"
	);
	const page = usePaginatedQuery(
		convex.ghCard.listPage,
		hasSearchKeyword ? "skip" : args,
		{ initialNumItems: PAGE_SIZE }
	);
	const { removeSearchParam } = useTagFilters();
	const { filteredCards, handleFilter, clearFilter } = useFilter(
		filterKeyword,
		setFilterKeyword,
		ghCards || [],
		removeSearchParam,
		searchOpen,
		setSearchOpen
	);
	const cards = hasSearchKeyword
		? filteredCards.slice(0, visible)
		: page.results;
	const isLoading = hasSearchKeyword
		? ghCards === undefined
		: page.status === "LoadingFirstPage";
	const canLoadMore = hasSearchKeyword
		? visible < filteredCards.length
		: page.status === "CanLoadMore";
	const exhausted = hasSearchKeyword
		? ghCards !== undefined
		: page.status === "Exhausted";
	const loadMore = useCallback(() => {
		if (hasSearchKeyword) setVisible((count) => count + PAGE_SIZE);
		else page.loadMore(PAGE_SIZE);
	}, [hasSearchKeyword, page.loadMore]);
	const sentinel = useInfiniteScroll({ canLoadMore, loadMore });
	const hasTagFilters = (props.tagFilters?.length ?? 0) > 0;
	const tagKey = JSON.stringify(props.tagFilters ?? []);
	const firstMount = useRef(true);
	useEffect(() => {
		if (firstMount.current) {
			firstMount.current = false;
			return;
		}
		window.scrollTo(0, 0);
	}, [props.sortOrder, tagKey]);
	useEffect(() => {
		setVisible(PAGE_SIZE);
	}, [filterKeyword, props.sortOrder, tagKey]);

	const renderCards = () => {
		if (isLoading) {
			return <GhCardGridSkeleton />;
		}

		if (cards.length === 0 && exhausted) {
			if (hasSearchKeyword) {
				return (
					<EmptyState
						icon={SearchX}
						title={`No results for "${filterKeyword}"`}
						description="Try a different keyword, or clear the search to see all your cards."
						action={{ label: "Clear search", onClick: clearFilter }}
					/>
				);
			}
			if (hasTagFilters) {
				return (
					<EmptyState
						icon={Tags}
						title="No cards match the selected tags"
						description="Try selecting different tags, or clear the tag filters to see all your cards."
						action={{ label: "Clear tag filters", onClick: removeSearchParam }}
					/>
				);
			}
			return (
				<EmptyState
					icon={FileUp}
					title="Start your snippet library"
					description="Save the Grasshopper definitions you reuse. Drop a .gh or .ghx file anywhere on this page, or copy components in Grasshopper and paste them here."
					action={{
						label: "Add your first card",
						onClick: () => openAddDialog(),
						primary: true,
					}}
				>
					<p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
						or press <Kbd>{mod}</Kbd>
						<Kbd>V</Kbd> to paste GhXml
					</p>
				</EmptyState>
			);
		}

		return (
			<div className={cardGridClass}>
				{cards.map((item) => (
					<GHCard
						key={item._id}
						cardInfo={item}
						tagFilters={props.tagFilters}
					/>
				))}
				{!hasSearchKeyword &&
					page.status === "LoadingMore" &&
					Array.from({ length: 4 }, (_, i) => (
						<GhCardSkeleton key={`skeleton-${i}`} />
					))}
			</div>
		);
	};

	return (
		<>
			<Filter
				showFilter={searchOpen}
				handleFilterAction={handleFilter}
				prevFilter={filterKeyword}
				matchCount={filteredCards.length}
				onDismiss={() => setSearchOpen(false)}
				onClear={clearFilter}
			/>
			{hasSearchKeyword && (
				<div className="flex items-center gap-2 pb-4 text-sm">
					<span className="text-neutral-500">
						{filteredCards.length}{" "}
						{filteredCards.length === 1 ? "result" : "results"} for
					</span>
					<span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pr-1 pl-2.5 font-medium text-neutral-100">
						{filterKeyword}
						<button
							type="button"
							aria-label="Clear search"
							className="rounded-full p-0.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
							onClick={() => clearFilter()}
						>
							<X className="size-3.5" aria-hidden />
						</button>
					</span>
				</div>
			)}
			{renderCards()}
			{cards.length > 0 && (
				<p className="sr-only" aria-live="polite">
					Showing {cards.length} cards
				</p>
			)}
			<div ref={sentinel} />
			{canLoadMore && (
				<div className="flex justify-center pt-6">
					<Button type="button" variant="outline" onClick={loadMore}>
						Load more
					</Button>
				</div>
			)}
		</>
	);
}
