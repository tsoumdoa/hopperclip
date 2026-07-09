"use client";
import { InvalidValueDialog } from "./gh-card-dialog";
import { NormalButtons } from "./gh-card-normal-buttons";
import { EditButtons } from "./gh-card-edit-buttons";
import { NameDescriptionAndTags } from "./gh-card-body";
import useGhCardControl from "../hooks/use-gh-card-control";
import GhCardTags from "./gh-card-tags";
import { MetricsDialog } from "./metrics-dialog";
import { useScriptMetrics } from "../hooks/use-script-metrics";
import { useState } from "react";
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

	// Query for active shares to show "Shared" badge
	const activeShares = useQuery(api.ghCard.getActiveSharesForPost, {
		postId: props.cardInfo._id,
	});
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
				className="flex h-full w-full items-center justify-center rounded-md bg-neutral-800 p-3 ring-1 ring-neutral-500"
				role="status"
			>
				<p className="py-8 text-sm text-neutral-400">Deleting...</p>
			</div>
		);
	}

	// Removed from the grid immediately; the Convex query refetch confirms it.
	if (deleted) {
		return null;
	}

	return (
		<>
			<div
				className={`relative flex cursor-pointer flex-col justify-between rounded-md p-3 ring-1 ring-neutral-500 transition-all focus-visible:ring-2 focus-visible:ring-neutral-100 focus-visible:outline-none ${editMode || updating ? "bg-neutral-500" : "bg-neutral-900 hover:bg-neutral-800"}`}
				role="button"
				tabIndex={editMode ? -1 : 0}
				aria-label={`View metrics for ${ghInfo.name}`}
				onClick={handleCardClick}
				onKeyDown={(e) => {
					if (e.target !== e.currentTarget) return;
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleCardClick();
					}
				}}
			>
				{hasActiveShare && (
					<button
						className={`absolute top-3 right-3 h-fit w-fit rounded-md bg-green-300 px-2 text-sm font-bold text-neutral-800 hover:cursor-pointer`}
						onClick={(e) => {
							e.stopPropagation();
							handleShare();
						}}
					>
						Shared
					</button>
				)}
				<InvalidValueDialog
					open={invalidInput}
					setOpen={() => setInvalidInput(false)}
				/>

				{ghInfo.tags.length > 0 && (
					<GhCardTags
						tags={ghInfo.tags}
						useNarrow={!!hasActiveShare}
						tagFilters={props.tagFilters}
						editMode={editMode}
						removeTag={removeTag}
					/>
				)}

				<NameDescriptionAndTags
					editMode={editMode}
					setEditMode={() => setEditMode(!editMode)}
					setGhInfo={setGhInfo}
					ghInfo={ghInfo}
					bucketId={props.cardInfo.bucketUrl ?? ""}
					lastEdited={props.cardInfo.dateUpdated!}
					created={props.cardInfo.dateCreated!}
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
				<div onClick={(e) => e.stopPropagation()}>
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
