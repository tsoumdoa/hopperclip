import { useMemo, useState, useTransition } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

export default function useTagFilters() {
	const searchParam = "tagFilter";
	const [tagFilters, setTagFilters] = useState<string[]>([]);
	const [isPending, startTransition] = useTransition();
	const search = useSearch({ strict: false }) as Record<string, string | undefined>;
	const navigate = useNavigate();

	const params = useMemo(() => {
		const urlParams = new URLSearchParams();
		for (const [key, value] of Object.entries(search)) {
			if (value !== undefined) {
				urlParams.set(key, value);
			}
		}
		return urlParams;
	}, [search]);

	const updateSearchParam = (t: string, add: boolean) => {
		const currentFilters = params.get(searchParam);
		const cfArr = currentFilters?.split(",") ?? [];
		const currentTagFilters = [...cfArr, ...tagFilters];
		const set = new Set(currentTagFilters);
		const unique = [...set];

		if (add) {
			const newTagFilters = [...unique, t];
			startTransition(() => {
				navigate({
					to: "/ghcards",
					search: (prev) => ({
						...prev,
						tagFilter: newTagFilters.join(","),
					}),
					replace: true,
				});
			});
			setTagFilters(newTagFilters);
		} else {
			const newTagFilters = unique.filter((tf) => tf !== t);
			if (newTagFilters.length === 0) {
				removeSearchParam();
				return;
			}
			startTransition(() => {
				navigate({
					to: "/ghcards",
					search: (prev) => ({
						...prev,
						tagFilter: newTagFilters.join(","),
					}),
					replace: true,
				});
			});
		}
	};

	const removeSearchParam = () => {
		setTagFilters([]);
		startTransition(() => {
			navigate({
				to: "/ghcards",
				search: (prev) => {
					const next = { ...prev };
					delete next.tagFilter;
					return next;
				},
				replace: true,
			});
		});
	};

	return {
		tagFilters,
		setTagFilters,
		updateSearchParam,
		removeSearchParam,
		params,
		startTransition,
		isPending,
	};
}
