"use client";
import GHCard from "@/app/components/gh-card";
import { useGhCardsPageActions } from "@/app/ghcards/contexts/gh-cards-page-context";
import useFilter from "../hooks/use-filter";
import Filter from "./filter";
import { X } from "lucide-react";
import { api as convex } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { SortOrder } from "@/types/types";
import useTagFilters from "../hooks/use-tag-filters";
import { GhCardGridSkeleton } from "./gh-card-skeleton";

function EmptyState(props: {
	title: string;
	description: string;
	action?: { label: string; onClick: () => void };
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-md py-20 text-center ring-1 ring-neutral-800">
			<p className="text-lg font-semibold text-neutral-200">{props.title}</p>
			<p className="max-w-md text-sm text-neutral-500">{props.description}</p>
			{props.action && (
				<button
					className="mt-3 h-8 rounded-md bg-black px-3 py-1 text-sm font-bold text-white ring-2 ring-neutral-300 transition-all hover:translate-x-0.5 hover:translate-y-0.5"
					onClick={props.action.onClick}
				>
					{props.action.label}
				</button>
			)}
		</div>
	);
}

export default function GHCardDisplay(props: {
	tagFilters?: string[];
	sortOrder: SortOrder;
}) {
	const { openAddDialog } = useGhCardsPageActions();
	const ghCards = useQuery(convex.ghCard.getAll, {
		tags: props.tagFilters,
		sortOrder: props.sortOrder,
	});

	const { removeSearchParam } = useTagFilters();

	const {
		filteredCards,
		showFilter,
		handleFilter,
		filterKeyword,
		clearFilter,
	} = useFilter(ghCards || [], removeSearchParam);

	const isLoading = ghCards === undefined;
	const hasSearchKeyword = filterKeyword.current.length > 0;
	const hasTagFilters = (props.tagFilters?.length ?? 0) > 0;

	const renderCards = () => {
		if (isLoading) {
			return <GhCardGridSkeleton />;
		}

		if (filteredCards.length === 0) {
			if (hasSearchKeyword) {
				return (
					<EmptyState
						title={`No results for "${filterKeyword.current}"`}
						description="Try a different keyword, or clear the filter to see all your cards."
						action={{ label: "Clear filter", onClick: clearFilter }}
					/>
				);
			}
			if (hasTagFilters) {
				return (
					<EmptyState
						title="No cards match the selected tags"
						description="Try selecting different tags, or clear the tag filters to see all your cards."
						action={{ label: "Clear tag filters", onClick: removeSearchParam }}
					/>
				);
			}
			return (
				<EmptyState
					title="Your library is empty"
					description="Drop a .gh or .ghx file anywhere on this page, paste GhXml from Grasshopper, or add your first card to start building your snippet library."
					action={{
						label: "Add your first card",
						onClick: () => openAddDialog(),
					}}
				/>
			);
		}

		return (
			<div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
				{filteredCards.map((item) => (
					<GHCard
						key={item.bucketUrl}
						cardInfo={item}
						tagFilters={props.tagFilters}
					/>
				))}
			</div>
		);
	};

	return (
		<>
			<Filter
				showFilter={showFilter}
				handleFilterAction={handleFilter}
				prevFilter={filterKeyword.current}
			/>
			{hasSearchKeyword && (
				<div className="flex flex-row items-center gap-x-1 pb-2">
					<span className="text-neutral-500">Filter keyword:</span>{" "}
					<span className="font-bold">{filterKeyword.current}</span>
					<button
						type="button"
						aria-label="Clear filter keyword"
						className="text-neutral-100 hover:cursor-pointer"
						onClick={() => clearFilter()}
					>
						<X className="h-3 w-3" aria-hidden />
					</button>
				</div>
			)}
			{renderCards()}
		</>
	);
}
