import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { CARD_ARRIVAL_MS } from "@/app/utils/new-card";
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
	/** Cards saved in this tab within the last CARD_ARRIVAL_MS. */
	arrivingCardIds: ReadonlySet<string>;
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
	markCardArrived: (cardId: string) => void;
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
	const [arrivingCardIds, setArrivingCardIds] = useState<ReadonlySet<string>>(
		() => new Set()
	);
	const arrivalTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
	useEffect(() => {
		const timers = arrivalTimers.current;
		return () => {
			for (const timer of timers) clearTimeout(timer);
			timers.clear();
		};
	}, []);

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

	const markCardArrived = useCallback((cardId: string) => {
		setArrivingCardIds((current) => new Set(current).add(cardId));
		const timer = setTimeout(() => {
			arrivalTimers.current.delete(timer);
			setArrivingCardIds((current) => {
				const next = new Set(current);
				next.delete(cardId);
				return next;
			});
		}, CARD_ARRIVAL_MS);
		arrivalTimers.current.add(timer);
	}, []);

	const state = useMemo(
		() => ({
			cardPreview,
			addDialogOpen,
			searchOpen,
			pendingFile,
			pendingXml,
			hasEditingCards: editingCardIds.size > 0,
			arrivingCardIds,
		}),
		[
			cardPreview,
			addDialogOpen,
			searchOpen,
			pendingFile,
			pendingXml,
			editingCardIds,
			arrivingCardIds,
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
			markCardArrived,
		}),
		[
			setCardPreviewPreference,
			openAddDialog,
			openAddDialogFromPaste,
			consumePendingFile,
			consumePendingXml,
			setCardEditing,
			markCardArrived,
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
