import { type RefObject, useEffect, useState } from "react";
import {
	useGhCardsPageActions,
	useGhCardsPageState,
} from "@/app/ghcards/contexts/gh-cards-page-context";
import { CARD_ARRIVAL_MS } from "@/app/utils/new-card";

/**
 * True for CARD_ARRIVAL_MS after a card saved in this tab first renders, and
 * scrolls it into view. The timer starts when the card shows up, not when the
 * save finished, so a card revealed later (e.g. by clearing a filter) still
 * gets its ring.
 */
export function useCardArrival(
	cardId: string,
	cardRef: RefObject<HTMLElement | null>
): boolean {
	const { arrivingCardIds } = useGhCardsPageState();
	const { consumeCardArrival } = useGhCardsPageActions();
	const hasMarker = arrivingCardIds.has(cardId);
	const [isArriving, setIsArriving] = useState(false);

	useEffect(() => {
		if (!hasMarker) return;
		consumeCardArrival(cardId);
		setIsArriving(true);
	}, [hasMarker, cardId, consumeCardArrival]);

	useEffect(() => {
		if (!isArriving) return;
		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		cardRef.current?.scrollIntoView({
			block: "nearest",
			behavior: reduceMotion ? "auto" : "smooth",
		});
		const timer = setTimeout(() => setIsArriving(false), CARD_ARRIVAL_MS);
		return () => clearTimeout(timer);
	}, [isArriving, cardRef]);

	return isArriving;
}
