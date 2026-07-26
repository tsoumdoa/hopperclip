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
	addDialogOpen: boolean;
	pendingFile: File | null;
	pendingXml: string | null;
	hasEditingCards: boolean;
};

type GhCardsPageActions = {
	setAddDialogOpen: Dispatch<SetStateAction<boolean>>;
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
	const [addDialogOpen, setAddDialogOpen] = useState(false);
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
			addDialogOpen,
			pendingFile,
			pendingXml,
			hasEditingCards: editingCardIds.size > 0,
		}),
		[addDialogOpen, pendingFile, pendingXml, editingCardIds]
	);
	const actions = useMemo(
		() => ({
			setAddDialogOpen,
			openAddDialog,
			openAddDialogFromPaste,
			consumePendingFile,
			consumePendingXml,
			setCardEditing,
		}),
		[
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
