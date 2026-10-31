import { useMemo, useTransition } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

export default function useTagFilters() {
	const searchParam = "tagFilter";

	const [isPending, startTransition] = useTransition();
	const search = useSearch({ strict: false }) as Record<
		string,
		string | undefined
	>;
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

	const tagFilters = (params.get(searchParam) ?? "").split(",").filter(Boolean);

	const updateSearchParam = (t: string, add: boolean) => {
		const unique = tagFilters;

		if (add) {
			const newTagFilters = [...new Set([...unique, t])];
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
		updateSearchParam,
		removeSearchParam,
		params,
		startTransition,
		isPending,
	};
}
