import { useEffect, useState, useRef } from "react";
import Fuse from "fuse.js";
import { GhPost } from "@/types/types";

const fuseOptions = {
	keys: [],
	includeScore: true,
	threshold: 0.3,
	ignoreLocation: true,
	ignoreCase: true,
};

export default function useFilter(
	ghCards: GhPost[],
	onClearTagFilters?: () => void
) {
	const [filteredCards, setFilteredCards] = useState(ghCards);
	const [showFilterInput, setShowFilterInput] = useState(false);
	const filterKeyword = useRef<string>("");
	const tagFiltersCleared = useRef(false);
	const onClearTagFiltersRef = useRef(onClearTagFilters);
	onClearTagFiltersRef.current = onClearTagFilters;
	const nameFuse = new Fuse(
		ghCards.map((card) => card.name ?? ""),
		fuseOptions
	);

	const tagFuse = new Fuse(
		ghCards.map((card) => card.tags ?? []).flat(),
		fuseOptions
	);

	const descriptionFuse = new Fuse(
		ghCards.map((card) => card.description ?? ""),
		fuseOptions
	);

	const clearFilter = () => {
		setFilteredCards(ghCards);
		filterKeyword.current = "";
		setShowFilterInput(false);
		tagFiltersCleared.current = false;
	};

	useEffect(() => {
		if (filterKeyword.current === "") {
			setFilteredCards(ghCards);
		} else {
			updateFilter(filterKeyword.current); //updateFilter when ghCards changes and use current keyword
		}
	}, [ghCards]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setShowFilterInput((prev) => !prev);
			}
			if (e.key === "Escape") {
				if (showFilterInput) {
					clearFilter();
				} else if (onClearTagFiltersRef.current && !tagFiltersCleared.current) {
					tagFiltersCleared.current = true;
					onClearTagFiltersRef.current();
				} else {
					clearFilter();
				}
			}
			if (e.key === "Enter") {
				setShowFilterInput(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [ghCards, showFilterInput]);

	const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
		const keyword = e.target.value.toLowerCase();
		filterKeyword.current = keyword;
		updateFilter(keyword);
	};

	const updateFilter = (keyword: string) => {
		if (keyword === "") {
			setFilteredCards(ghCards);
			return;
		}

		const nameMatches = nameFuse.search(keyword);
		const descriptionMatches = descriptionFuse.search(keyword);
		const tagMatches = tagFuse.search(keyword);
		const set = new Set([
			...nameMatches.map((m) => m.item),
			...descriptionMatches.map((m) => m.item),
			...tagMatches.map((m) => m.item),
		]);
		setFilteredCards(
			ghCards.filter(
				(card) =>
					set.has(card.name ?? "") ||
					set.has(card.description ?? "") ||
					card.tags?.some((tag) => set.has(tag))
			)
		);
	};

	return {
		filteredCards,
		showFilter: showFilterInput,
		handleFilter,
		setShowFilter: setShowFilterInput,
		updateFilter,
		filterKeyword,
		clearFilter,
	};
}
