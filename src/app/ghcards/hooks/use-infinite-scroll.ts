import { useEffect, useRef } from "react";

export function shouldLoadMore(canLoadMore: boolean, intersecting: boolean) {
	return canLoadMore && intersecting;
}

export function useInfiniteScroll({
	canLoadMore,
	loadMore,
}: {
	canLoadMore: boolean;
	loadMore: () => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const element = ref.current;
		if (!element || !canLoadMore) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (
					shouldLoadMore(
						canLoadMore,
						entries.some((entry) => entry.isIntersecting)
					)
				)
					loadMore();
			},
			{ rootMargin: "800px" }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, [canLoadMore, loadMore]);
	return ref;
}
