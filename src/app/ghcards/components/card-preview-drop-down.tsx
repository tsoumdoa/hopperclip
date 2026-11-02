import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutPanelTop } from "lucide-react";
import {
	useGhCardsPageActions,
	useGhCardsPageState,
} from "../contexts/gh-cards-page-context";

export function CardPreviewDropDown() {
	const { cardPreview } = useGhCardsPageState();
	const { setCardPreviewPreference } = useGhCardsPageActions();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Card preview"
					className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-neutral-300 transition-colors hover:border-white/20 hover:text-white data-[state=open]:border-white/20"
				>
					<LayoutPanelTop className="size-4 text-neutral-500" aria-hidden />
					<span className="hidden lg:inline">Card preview</span>
					<ChevronDown className="size-3.5 text-neutral-500" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end">
				<DropdownMenuLabel>Card preview</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup
					value={cardPreview}
					onValueChange={(value) => {
						if (value === "thumbnail" || value === "recipe" || value === "off")
							setCardPreviewPreference(value);
					}}
				>
					<DropdownMenuRadioItem value="thumbnail">
						Thumbnail
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="recipe">Recipe</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="off">Off</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
