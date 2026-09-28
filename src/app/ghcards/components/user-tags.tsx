import FilterTagDisplay from "./user-tag-display";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tag, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import useTagFilters from "../hooks/use-tag-filters";
import { LoadingSpinner } from "./loading-spinner";
import { useQuery } from "convex/react";
import { api as convex } from "../../../../convex/_generated/api";

export default function UserTags(props: { tagFilters: string[] }) {
	const [hideFilter, setHideFilter] = useState(false);
	const navigate = useNavigate();

	const {
		tagFilters,
		setTagFilters,
		updateSearchParam,
		removeSearchParam,
		params,
		isPending,
		startTransition,
	} = useTagFilters();

	useEffect(() => {
		setTagFilters(props.tagFilters);
	}, [props.tagFilters, setTagFilters]);

	const filterOn = params.get("searchFilterOn");
	useEffect(() => {
		if (filterOn === "true") {
			setHideFilter(true);
		} else {
			setHideFilter(false);
		}

		const tagFilterIsStale = params.get("tagFilterIsStale");
		if (tagFilterIsStale === "true") {
			startTransition(() => {
				navigate({
					to: "/ghcards",
					search: (prev) => {
						const next = { ...prev };
						delete next.tagFilterIsStale;
						return next;
					},
					replace: true,
				});
			});
		}
	}, [navigate, params, props.tagFilters, startTransition]);

	const userTags = useQuery(convex.ghCard.getUserTags, {});

	if (hideFilter) return null;
	if (!userTags)
		return (
			<div className="flex gap-2" aria-hidden>
				{[64, 88, 56, 72].map((w) => (
					<Skeleton
						key={w}
						className="h-7 rounded-full bg-white/[0.06]"
						style={{ width: w }}
					/>
				))}
			</div>
		);
	if (userTags.length === 0) return null;
	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<Tag className="mr-0.5 size-3.5 text-neutral-600" aria-hidden />
			{userTags.map((t, i) => (
				<FilterTagDisplay
					key={`tag-${i}-${t.tag}`}
					tagFilters={tagFilters}
					userTag={t}
					setTagFilters={setTagFilters}
					updatePath={updateSearchParam}
				/>
			))}
			{!isPending && tagFilters.length > 0 && (
				<button
					type="button"
					onClick={() => removeSearchParam()}
					className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
				>
					<X className="size-3" aria-hidden />
					Clear
				</button>
			)}
			{isPending && <LoadingSpinner variant={"regular"} />}
		</div>
	);
}
