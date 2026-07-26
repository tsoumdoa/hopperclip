import { Skeleton } from "@/components/ui/skeleton";

export function GhCardSkeleton() {
	return (
		<div className="flex flex-col justify-between gap-3 rounded-md bg-neutral-900 p-3 ring-1 ring-neutral-700">
			<div className="space-y-2">
				<Skeleton className="h-4 w-14" />
				<Skeleton className="h-6 w-3/4" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
			</div>
			<div className="flex justify-end gap-3">
				<Skeleton className="h-4 w-10" />
				<Skeleton className="h-4 w-10" />
				<Skeleton className="h-4 w-10" />
			</div>
		</div>
	);
}

export function GhCardGridSkeleton({ count = 8 }: { count?: number }) {
	return (
		<div
			className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
			role="status"
			aria-label="Loading cards"
		>
			{Array.from({ length: count }).map((_, i) => (
				<GhCardSkeleton key={i} />
			))}
		</div>
	);
}
