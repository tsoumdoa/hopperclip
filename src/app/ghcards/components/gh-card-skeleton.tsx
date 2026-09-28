import { Skeleton } from "@/components/ui/skeleton";

export const cardGridClass =
	"grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

export function GhCardSkeleton() {
	return (
		<div className="bg-card flex flex-col gap-3 rounded-xl border border-white/[0.08] p-4">
			<Skeleton className="h-5 w-2/3 bg-white/[0.06]" />
			<div className="space-y-2">
				<Skeleton className="h-3.5 w-full bg-white/[0.06]" />
				<Skeleton className="h-3.5 w-1/2 bg-white/[0.06]" />
			</div>
			<div className="flex gap-1.5">
				<Skeleton className="h-5 w-16 rounded-md bg-white/[0.06]" />
				<Skeleton className="h-5 w-12 rounded-md bg-white/[0.06]" />
			</div>
			<div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-3">
				<Skeleton className="h-3.5 w-20 bg-white/[0.06]" />
				<div className="flex gap-1">
					<Skeleton className="h-7 w-16 bg-white/[0.06]" />
					<Skeleton className="size-7 bg-white/[0.06]" />
					<Skeleton className="size-7 bg-white/[0.06]" />
				</div>
			</div>
		</div>
	);
}

export function GhCardGridSkeleton({ count = 8 }: { count?: number }) {
	return (
		<div className={cardGridClass} role="status" aria-label="Loading cards">
			{Array.from({ length: count }).map((_, i) => (
				<GhCardSkeleton key={i} />
			))}
		</div>
	);
}
