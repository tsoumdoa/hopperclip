import { useCallback, useEffect, useState } from "react";

export type CardPreviewPreference = "thumbnail" | "recipe" | "off";
const STORAGE_KEY = "hopperclip:card-preview";

function preference(value: string | null): CardPreviewPreference {
	return value === "recipe" || value === "off" ? value : "thumbnail";
}

export function useCardPreviewPreference() {
	const [cardPreview, setCardPreview] =
		useState<CardPreviewPreference>("thumbnail");
	useEffect(() => {
		try {
			setCardPreview(preference(localStorage.getItem(STORAGE_KEY)));
		} catch {
			/* Storage may be unavailable. */
		}
		const onStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEY || event.key === null)
				setCardPreview(preference(event.newValue));
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);
	const setCardPreviewPreference = useCallback(
		(value: CardPreviewPreference) => {
			setCardPreview(value);
			try {
				localStorage.setItem(STORAGE_KEY, value);
			} catch {
				/* Keep the in-memory preference. */
			}
		},
		[]
	);
	return { cardPreview, setCardPreviewPreference };
}
