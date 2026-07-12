"use client";

import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { updateEditingCardIds } from "@/app/utils/gh-card-edit-state";

type GhCardsPageState = {
	addDialogOpen: boolean;
	pendingFile: File | null;
	hasEditingCards: boolean;
};

type GhCardsPageActions = {
	setAddDialogOpen: Dispatch<SetStateAction<boolean>>;
	openAddDialog: (file?: File) => void;
	consumePendingFile: () => void;
	setCardEditing: (cardId: string, editMode: boolean) => void;
};

const GhCardsPageStateContext = createContext<GhCardsPageState | null>(null);
const GhCardsPageActionsContext = createContext<GhCardsPageActions | null>(
	null
);

export function GhCardsPageProvider({ children }: { children: ReactNode }) {
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [editingCardIds, setEditingCardIds] = useState<Set<string>>(
		() => new Set()
	);

	const openAddDialog = useCallback((file?: File) => {
		setPendingFile(file ?? null);
		setAddDialogOpen(true);
	}, []);

	const consumePendingFile = useCallback(() => {
		setPendingFile(null);
	}, []);

	const setCardEditing = useCallback((cardId: string, editMode: boolean) => {
		setEditingCardIds((current) =>
			updateEditingCardIds(current, cardId, editMode)
		);
	}, []);

	const state = useMemo(
		() => ({
			addDialogOpen,
			pendingFile,
			hasEditingCards: editingCardIds.size > 0,
		}),
		[addDialogOpen, pendingFile, editingCardIds]
	);
	const actions = useMemo(
		() => ({
			setAddDialogOpen,
			openAddDialog,
			consumePendingFile,
			setCardEditing,
		}),
		[openAddDialog, consumePendingFile, setCardEditing]
	);

	return (
		<GhCardsPageActionsContext.Provider value={actions}>
			<GhCardsPageStateContext.Provider value={state}>
				{children}
			</GhCardsPageStateContext.Provider>
		</GhCardsPageActionsContext.Provider>
	);
}

export function useGhCardsPageState() {
	const state = useContext(GhCardsPageStateContext);
	if (!state) {
		throw new Error(
			"useGhCardsPageState must be used within GhCardsPageProvider"
		);
	}
	return state;
}

export function useGhCardsPageActions() {
	const actions = useContext(GhCardsPageActionsContext);
	if (!actions) {
		throw new Error(
			"useGhCardsPageActions must be used within GhCardsPageProvider"
		);
	}
	return actions;
}
