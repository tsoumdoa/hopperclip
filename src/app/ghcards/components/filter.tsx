import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Kbd } from "@/components/ui/kbd";

export default function Filter(props: {
	handleFilterAction: (e: React.ChangeEvent<HTMLInputElement>) => void;
	showFilter: boolean;
	prevFilter: string;
	matchCount: number;
	onDismiss: () => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (props.showFilter) {
			ref.current?.focus();
		}
	}, [props.showFilter]);

	if (!props.showFilter) return null;
	return (
		<div
			className="animate-in fade-in-0 fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[15vh] backdrop-blur-sm duration-150"
			onClick={props.onDismiss}
		>
			<div
				role="search"
				className="animate-in zoom-in-95 slide-in-from-top-2 bg-popover w-full max-w-xl overflow-hidden rounded-xl border border-white/10 shadow-2xl duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
					<Search className="size-4 shrink-0 text-neutral-500" aria-hidden />
					<input
						ref={ref}
						onChange={props.handleFilterAction}
						aria-label="Search cards"
						className="h-14 w-full bg-transparent text-base text-white outline-none placeholder:text-neutral-500"
						placeholder="Search by name, description, or tag"
						value={props.prevFilter}
					/>
				</div>
				<div className="flex items-center justify-between px-4 py-2.5 text-xs text-neutral-500">
					<span className="tabular-nums">
						{props.prevFilter.length > 0
							? `${props.matchCount} ${props.matchCount === 1 ? "match" : "matches"}`
							: "Type to filter your library"}
					</span>
					<span className="flex items-center gap-3">
						<span className="flex items-center gap-1.5">
							<Kbd>↵</Kbd> apply
						</span>
						<span className="flex items-center gap-1.5">
							<Kbd>esc</Kbd> clear
						</span>
					</span>
				</div>
			</div>
		</div>
	);
}
