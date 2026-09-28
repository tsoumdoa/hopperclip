import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SORT_ORDERS, SortOrder, SortOrderValue } from "@/types/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowDownUp, ChevronDown } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { LoadingSpinner } from "./loading-spinner";

export default function SortDropDown() {
	const [position, setPosition] = useState<SortOrder>("ascLastEdited");
	const [sortBy, setSortBy] = useState<SortOrderValue>();
	const search = useSearch({ from: "/_authed/ghcards" });
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		const sortOrder = search.sort ?? "ascLastEdited";
		const sortName = SORT_ORDERS.find(
			(item) => item.value === sortOrder
		)?.label;
		setSortBy(sortName);
		setPosition(sortOrder);
	}, [search.sort]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Sort order: ${sortBy ?? "default"}`}
					className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-neutral-300 transition-colors hover:border-white/20 hover:text-white data-[state=open]:border-white/20"
				>
					{isPending ? (
						<LoadingSpinner variant={"small"} />
					) : (
						<ArrowDownUp className="size-4 text-neutral-500" aria-hidden />
					)}
					<span className="hidden lg:inline">{sortBy || "Sort by"}</span>
					<ChevronDown className="size-3.5 text-neutral-500" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end">
				<DropdownMenuLabel>Sort Order</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup
					value={position}
					onValueChange={(v) => {
						setPosition(v as SortOrder);
						const sortBy = SORT_ORDERS.find((item) => item.value === v)?.label;
						setSortBy(sortBy!);
						startTransition(() => {
							navigate({
								to: "/ghcards",
								search: (prev) => ({
									...prev,
									sort: v as SortOrder,
								}),
								replace: true,
							});
						});
					}}
				>
					{SORT_ORDERS.map((item) => (
						<DropdownMenuRadioItem key={item.value} value={item.value}>
							{item.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
