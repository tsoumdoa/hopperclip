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

const cardSearchOptions = {
	keys: ["name", "description", "tags"],
	// Keep the order supplied by the Library sort selector.
	shouldSort: false,
	threshold: 0.3,
	ignoreLocation: true,
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
	const index = useMemo(() => new Fuse(ghCards, cardSearchOptions), [ghCards]);

	// Must stay derived during render: syncing via an effect shows the empty
	// state for a frame after cards load.
	const filteredCards = useMemo(() => {
		if (filterKeyword === "") return ghCards;

		return index.search(filterKeyword).map(({ item }) => item);
	}, [ghCards, filterKeyword, index]);

	const clearFilter = () => {
		setFilterKeyword("");
		setShowFilterInput(false);
		tagFiltersCleared.current = false;
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Dialogs own their keyboard handling while open.
			if (
				e.defaultPrevented ||
				(e.target instanceof Element &&
					e.target.closest('[role="dialog"], [role="alertdialog"]'))
			)
				return;
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
