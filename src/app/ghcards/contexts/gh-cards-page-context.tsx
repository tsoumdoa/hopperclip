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
import {
	useCardPreviewPreference,
	type CardPreviewPreference,
} from "../hooks/use-card-preview-preference";

export type PendingGhCardImportState = {
	pendingFile: File | null;
	pendingXml: string | null;
};

export function pendingGhCardFileImport(file?: File): PendingGhCardImportState {
	return { pendingFile: file ?? null, pendingXml: null };
}

export function pendingGhCardXmlImport(xml: string): PendingGhCardImportState {
	return { pendingFile: null, pendingXml: xml };
}

type GhCardsPageState = {
	cardPreview: CardPreviewPreference;
	addDialogOpen: boolean;
	searchOpen: boolean;
	pendingFile: File | null;
	pendingXml: string | null;
	hasEditingCards: boolean;
};

type GhCardsPageActions = {
	setCardPreviewPreference: (value: CardPreviewPreference) => void;
	setAddDialogOpen: Dispatch<SetStateAction<boolean>>;
	setSearchOpen: Dispatch<SetStateAction<boolean>>;
	openAddDialog: (file?: File) => void;
	openAddDialogFromPaste: (xml: string) => void;
	consumePendingFile: () => void;
	consumePendingXml: () => void;
	setCardEditing: (cardId: string, editMode: boolean) => void;
};

const GhCardsPageStateContext = createContext<GhCardsPageState | null>(null);
const GhCardsPageActionsContext = createContext<GhCardsPageActions | null>(
	null
);

export function GhCardsPageProvider({ children }: { children: ReactNode }) {
	const { cardPreview, setCardPreviewPreference } = useCardPreviewPreference();
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [pendingXml, setPendingXml] = useState<string | null>(null);
	const [editingCardIds, setEditingCardIds] = useState<Set<string>>(
		() => new Set()
	);

	const openAddDialog = useCallback((file?: File) => {
		const pending = pendingGhCardFileImport(file);
		setPendingFile(pending.pendingFile);
		setPendingXml(pending.pendingXml);
		setAddDialogOpen(true);
	}, []);
	const openAddDialogFromPaste = useCallback((xml: string) => {
		const pending = pendingGhCardXmlImport(xml);
		setPendingFile(pending.pendingFile);
		setPendingXml(pending.pendingXml);
		setAddDialogOpen(true);
	}, []);

	const consumePendingFile = useCallback(() => {
		setPendingFile(null);
	}, []);
	const consumePendingXml = useCallback(() => {
		setPendingXml(null);
	}, []);

	const setCardEditing = useCallback((cardId: string, editMode: boolean) => {
		setEditingCardIds((current) =>
			updateEditingCardIds(current, cardId, editMode)
		);
	}, []);

	const state = useMemo(
		() => ({
			cardPreview,
			addDialogOpen,
			searchOpen,
			pendingFile,
			pendingXml,
			hasEditingCards: editingCardIds.size > 0,
		}),
		[
			cardPreview,
			addDialogOpen,
			searchOpen,
			pendingFile,
			pendingXml,
			editingCardIds,
		]
	);
	const actions = useMemo(
		() => ({
			setCardPreviewPreference,
			setAddDialogOpen,
			setSearchOpen,
			openAddDialog,
			openAddDialogFromPaste,
			consumePendingFile,
			consumePendingXml,
			setCardEditing,
		}),
		[
			setCardPreviewPreference,
			openAddDialog,
			openAddDialogFromPaste,
			consumePendingFile,
			consumePendingXml,
			setCardEditing,
		]
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
