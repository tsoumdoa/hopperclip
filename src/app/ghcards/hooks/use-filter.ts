import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
	useRef,
} from "react";
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
	onClearTagFilters: (() => void) | undefined,
	showFilterInput: boolean,
	setShowFilterInput: Dispatch<SetStateAction<boolean>>
) {
	const [filterKeyword, setFilterKeyword] = useState("");
	const tagFiltersCleared = useRef(false);
	const onClearTagFiltersRef = useRef(onClearTagFilters);
	onClearTagFiltersRef.current = onClearTagFilters;
	const indexes = useMemo(
		() => [
			new Fuse(
				ghCards.map((card) => card.name ?? ""),
				fuseOptions
			),
			new Fuse(
				ghCards.map((card) => card.description ?? ""),
				fuseOptions
			),
			new Fuse(
				ghCards.flatMap((card) => card.tags ?? []),
				fuseOptions
			),
		],
		[ghCards]
	);

	// Must stay derived during render: syncing via an effect shows the empty
	// state for a frame after cards load.
	const filteredCards = useMemo(() => {
		if (filterKeyword === "") return ghCards;

		const set = new Set(
			indexes.flatMap((index) => index.search(filterKeyword).map((m) => m.item))
		);
		return ghCards.filter(
			(card) =>
				set.has(card.name ?? "") ||
				set.has(card.description ?? "") ||
				card.tags?.some((tag) => set.has(tag))
		);
	}, [ghCards, filterKeyword, indexes]);

	const clearFilter = () => {
		setFilterKeyword("");
		setShowFilterInput(false);
		tagFiltersCleared.current = false;
	};

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
	}, [showFilterInput]);

	const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilterKeyword(e.target.value.toLowerCase());
	};

	return {
		filteredCards,
		handleFilter,
		filterKeyword,
		clearFilter,
	};
}
