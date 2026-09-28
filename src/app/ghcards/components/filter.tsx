import { Search } from "lucide-react";
import { useRef } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function Filter(props: {
	handleFilterAction: (e: React.ChangeEvent<HTMLInputElement>) => void;
	showFilter: boolean;
	prevFilter: string;
	matchCount: number;
	onDismiss: () => void;
	onClear: () => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	const returnFocus = useRef<HTMLElement | null>(null);

	return (
		<Dialog
			open={props.showFilter}
			onOpenChange={(open) => {
				if (!open) props.onDismiss();
			}}
		>
			<DialogContent
				className="top-[15vh] w-[calc(100%-2rem)] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
				aria-describedby={undefined}
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					returnFocus.current = document.activeElement as HTMLElement | null;
					ref.current?.focus();
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					returnFocus.current?.focus();
				}}
				onEscapeKeyDown={(event) => {
					event.preventDefault();
					props.onClear();
				}}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) return;
					if (
						(event.key === "Enter" && event.target === ref.current) ||
						((event.metaKey || event.ctrlKey) &&
							event.key.toLowerCase() === "k")
					) {
						event.preventDefault();
						props.onDismiss();
					}
				}}
			>
				<DialogTitle className="sr-only">Search cards</DialogTitle>
				<div className="flex items-center gap-3 border-b border-white/[0.06] pr-12 pl-4">
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
			</DialogContent>
		</Dialog>
	);
}
