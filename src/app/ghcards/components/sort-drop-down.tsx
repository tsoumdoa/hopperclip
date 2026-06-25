"use client";

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
import { ChevronDown } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { LoadingSpinner } from "./loading-spinner";

export default function SortDropDown() {
	const [position, setPosition] = useState<SortOrder>("ascLastEdited");
	const [sortBy, setSortBy] = useState<SortOrderValue>();
	const search = useSearch({ from: "/_authed/ghcards" });
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		const sortOrder = search.sort;
		if (sortOrder) {
			const sortName = SORT_ORDERS.find(
				(item) => item.value === sortOrder
			)?.label;
			setSortBy(sortName);
			setPosition(sortOrder);
		}
	}, [search.sort]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<div className="flex h-8 cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-sm ring-1 ring-neutral-500 transition-all">
					<span>{sortBy || "Sort by"}</span>
					{isPending && <LoadingSpinner variant={"regular"} />}
					<ChevronDown className="h-4 w-4" />
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
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
