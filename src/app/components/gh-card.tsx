import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InvalidValueDialog } from "./gh-card-dialog";
import { DateDisplay } from "./gh-card-date-display";
import { NormalButtons } from "./gh-card-normal-buttons";
import { EditButtons } from "./gh-card-edit-buttons";
import { NameDescriptionAndTags } from "./gh-card-body";
import { DropOverlay } from "./drop-overlay";
import useGhCardControl from "../hooks/use-gh-card-control";
import { useDropZone } from "../hooks/use-drop-zone";
import GhCardTags from "./gh-card-tags";
import { MetricsDialog } from "./metrics-dialog";
import { useScriptMetrics } from "../hooks/use-script-metrics";
import { useEffect, useState } from "react";
import { useGhCardsPageActions } from "@/app/ghcards/contexts/gh-cards-page-context";
import { GhPost } from "@/types/types";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function GHCard(props: {
	cardInfo: GhPost;
	tagFilters?: string[];
}) {
	const {
		editMode,
		handleEdit,
		deletePost,
		setGhInfo,
		invalidInput,
		setInvalidInput,
		updating,
		deleting,
		deleted,
		setEditMode,
		removeTag,
		handleCancelEditMode,
		ghInfo,
		addTag,
		tag: inputTag,
		setTag: setInputTag,
		reset,
		setReset,
		newXmlData,
		setNewXmlData,
		isValidXml,
		xmlError,
		setXmlError,
		handlePasteFromClipboard,
		handleFileSelected,
	} = useGhCardControl(props.cardInfo);

	const { isDragging, dragHandlers } = useDropZone(
		handleFileSelected,
		editMode
	);
	const { setCardEditing } = useGhCardsPageActions();

	useEffect(() => {
		const cardId = props.cardInfo._id;
		setCardEditing(cardId, editMode);

		return () => {
			setCardEditing(cardId, false);
		};
	}, [editMode, props.cardInfo._id, setCardEditing]);

	const [openSharedDialog, setOpenSharedDialog] = useState(false);
	const [openMetricsDialog, setOpenMetricsDialog] = useState(false);
	const {
		metrics,
		nodes,
		edges,
		loading: loadingMetrics,
		error: metricsError,
		loadMetrics,
	} = useScriptMetrics();

	// Skip while deleting so Convex refetches don't race with deletePost.
	const activeShares = useQuery(
		api.ghCard.getActiveSharesForPost,
		deleting || deleted ? "skip" : { postId: props.cardInfo._id }
	);
	const hasActiveShare = activeShares && activeShares.length > 0;

	const handleShare = () => {
		setOpenSharedDialog(true);
	};

	const handleCardClick = async () => {
		if (editMode) return;
		setOpenMetricsDialog(true);
		await loadMetrics(props.cardInfo.bucketUrl!);
	};

	if (deleting) {
		return (
			<div
				className="bg-card flex h-full min-h-40 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 p-4 text-sm text-neutral-400"
				role="status"
			>
				<Loader2 className="size-4 animate-spin" aria-hidden />
				Deleting…
			</div>
		);
	}

	// Removed from the grid immediately; the Convex query refetch confirms it.
	if (deleted) {
		return null;
	}

	const isEditing = editMode || updating;

	return (
		<>
			<div
				className={cn(
					"group bg-card focus-visible:ring-ring relative flex flex-col rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none",
					isEditing
						? "border-green-300/30 ring-1 ring-green-300/15"
						: "cursor-pointer border-white/[0.08] hover:border-white/20 hover:bg-neutral-900",
					updating && "pointer-events-none opacity-70"
				)}
				role="button"
				tabIndex={editMode ? -1 : 0}
				aria-label={`Open ${ghInfo.name}`}
				onClick={handleCardClick}
				onKeyDown={(e) => {
					if (e.target !== e.currentTarget) return;
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleCardClick();
					}
				}}
				{...dragHandlers}
			>
				{isDragging && <DropOverlay className="rounded-xl" />}
				<InvalidValueDialog
					open={invalidInput}
					setOpen={() => setInvalidInput(false)}
				/>

				<NameDescriptionAndTags
					editMode={editMode}
					setEditMode={() => setEditMode(!editMode)}
					setGhInfo={setGhInfo}
					ghInfo={ghInfo}
					bucketId={props.cardInfo.bucketUrl ?? ""}
					titleAdornment={
						hasActiveShare && (
							<button
								type="button"
								className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-300/10 px-2 py-0.5 text-[11px] font-semibold text-green-300 ring-1 ring-green-300/30 transition-colors ring-inset hover:bg-green-300/20"
								onClick={(e) => {
									e.stopPropagation();
									handleShare();
								}}
							>
								<span className="size-1.5 rounded-full bg-green-300" />
								Shared
							</button>
						)
					}
					tagsSlot={
						ghInfo.tags.length > 0 && (
							<GhCardTags
								tags={ghInfo.tags}
								tagFilters={props.tagFilters}
								editMode={editMode}
								removeTag={removeTag}
							/>
						)
					}
					addTag={addTag}
					tag={inputTag}
					setTag={setInputTag}
					reset={reset}
					setReset={setReset}
					newXmlData={newXmlData}
					setNewXmlData={setNewXmlData}
					isValidXml={isValidXml}
					xmlError={xmlError}
					setXmlError={setXmlError}
					handlePasteFromClipboard={handlePasteFromClipboard}
					handleFileSelected={handleFileSelected}
				/>
				<div
					className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3"
					onClick={(e) => e.stopPropagation()}
				>
					{!editMode && (
						<DateDisplay
							createdDate={props.cardInfo.dateCreated}
							lastModDate={props.cardInfo.dateUpdated}
						/>
					)}
					{editMode ? (
						<EditButtons
							editMode={editMode}
							setEditMode={setEditMode}
							setGhInfo={setGhInfo}
							deletePost={() => deletePost()}
							handleEdit={(b) => handleEdit(b)}
							handleCancel={() => handleCancelEditMode()}
							ghInfo={{
								name: props.cardInfo.name!,
								description: props.cardInfo.description!,
								tags: props.cardInfo.tags ?? [],
							}}
						/>
					) : (
						<NormalButtons
							editMode={editMode}
							bucketId={props.cardInfo.bucketUrl}
							postId={props.cardInfo._id}
							setEditMode={() => setEditMode(true)}
							handleEdit={(b) => handleEdit(b)}
							openSharedDialog={openSharedDialog}
							setOpenSharedDialog={setOpenSharedDialog}
							handleShare={handleShare}
						/>
					)}
				</div>
			</div>
			<MetricsDialog
				title={ghInfo.name}
				open={openMetricsDialog}
				setOpen={setOpenMetricsDialog}
				metrics={metrics}
				nodes={nodes}
				edges={edges}
				loading={loadingMetrics}
				error={metricsError}
			/>
		</>
	);
}
