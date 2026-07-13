import {
	AlertDialogFooter,
	AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useValidateNameDescriptionAndTags } from "../hooks/use-validate-name-and-description";
import { useDropZone } from "../hooks/use-drop-zone";
import { DropOverlay } from "./drop-overlay";
import {
	GhCardXmlPaste,
	shouldAutoFillGhCardName,
	useXmlPasteHandler,
} from "./gh-card-xml-paste";
import { Button } from "@/components/ui/button";
import AddGhTagDisplay, { AvailableGhTagDisplay } from "./add-gh-tag-display";
import { useMutation, useQuery } from "convex/react";
import { api as convex } from "../../../convex/_generated/api";
import { nanoid } from "nanoid";
import { uploadToBucket, deleteFromBucket } from "@/server/r2-storage";
import { compress } from "../utils/gzip";
import type { AddGhDialogProps } from "@/types/gh-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GhFlowView } from "./gh-flow-view";
import { createFlowPreview } from "./gh-flow-preview";

type AddDialogTab = "details" | "flow";

export function AddGhDialog(props: AddGhDialogProps) {
	const userTags = useQuery(convex.ghCard.getUserTags, {});
	const addGhCard = useMutation(convex.ghCard.addPost);
	const [addError, setAddError] = useState("");
	const [xmlData, setXmlData] = useState<string>();
	const [isValidXml, setIsValidXml] = useState(false);
	const [activeTab, setActiveTab] = useState<AddDialogTab>("details");
	const autoFilledNameRef = useRef<string | null>(null);
	const currentNameRef = useRef("");
	const {
		name,
		setName,
		description,
		setDescription,
		isValid,
		tag,
		tags,
		setTag,
		setTags,
		handleAddTag,
		deleteTag,
		onTagValueChange,
		availableTags,
	} = useValidateNameDescriptionAndTags(setAddError, userTags ?? []);

	const autoFillName = (candidate: string) => {
		if (
			candidate.length > 0 &&
			shouldAutoFillGhCardName(
				currentNameRef.current,
				autoFilledNameRef.current
			)
		) {
			currentNameRef.current = candidate;
			setName(candidate);
			autoFilledNameRef.current = candidate;
		}
	};

	const handleNameChange = (value: string) => {
		currentNameRef.current = value;
		autoFilledNameRef.current = null;
		setName(value);
	};

	const {
		handlePasteFromClipboard,
		handleFileSelected,
		invalidatePendingImport,
	} = useXmlPasteHandler(setXmlData, setIsValidXml, setAddError, {
		onSingleScriptComponent: autoFillName,
		onFilePicked: autoFillName,
	});

	const { isDragging, dragHandlers } = useDropZone(
		handleFileSelected,
		props.open
	);

	const consumedInitialFileRef = useRef<File | null>(null);

	useEffect(() => {
		if (!props.open) {
			consumedInitialFileRef.current = null;
			setActiveTab("details");
			currentNameRef.current = "";
			autoFilledNameRef.current = null;
			setName("");
		}
	}, [props.open, setName]);

	const flowPreview = useMemo(
		() => (xmlData && isValidXml ? createFlowPreview(xmlData) : null),
		[isValidXml, xmlData]
	);

	useEffect(() => {
		if (!props.open || !props.initialFile) return;
		if (consumedInitialFileRef.current === props.initialFile) return;

		consumedInitialFileRef.current = props.initialFile;
		void handleFileSelected(props.initialFile);
		props.onInitialFileConsumed?.();
	}, [
		props.open,
		props.initialFile,
		props.onInitialFileConsumed,
		handleFileSelected,
	]);

	const handleClearPastedXml = () => {
		if (
			autoFilledNameRef.current !== null &&
			name === autoFilledNameRef.current
		) {
			currentNameRef.current = "";
			setName("");
		}
		autoFilledNameRef.current = null;
		setIsValidXml(false);
	};

	const handleSubmit = async () => {
		if (isValidXml && isValid && xmlData) {
			setAddError("");
			props.setAdding(true);
			const nanoId = nanoid();
			let uploaded = false;
			try {
				const ghXmlZipped = compress(xmlData);

				await uploadToBucket({
					data: { nanoId, ghXmlZipped: Array.from(ghXmlZipped) },
				});
				uploaded = true;

				await addGhCard({
					name: name,
					description: description,
					tags: tags,
					uid: nanoId,
				});

				props.setAdding(false);
				props.setOpen(false);

				setXmlData(undefined);
				setTags([]);
				setName("");
				currentNameRef.current = "";
				setDescription("");
				autoFilledNameRef.current = null;
				toast.success(`"${name}" added to your library`);
			} catch (error) {
				setAddError("Failed to add card. Please try again.");
				props.setAdding(false);
				if (uploaded) {
					try {
						await deleteFromBucket({ data: nanoId });
					} catch {}
				}
			}
		}
	};

	const hasValues = name || description || tags.length > 0 || xmlData;

	const handleEscapeKeyDown = (e: Event) => {
		if (hasValues) {
			e.preventDefault();
		} else {
			invalidatePendingImport();
			props.setOpen(false);
		}
	};

	const handleCancel = () => {
		invalidatePendingImport();
		setName("");
		currentNameRef.current = "";
		setDescription("");
		setAddError("");
		setTags([]);
		setTag("");
		setXmlData(undefined);
		autoFilledNameRef.current = null;
		props.setOpen(false);
	};

	return (
		<AlertDialog open={props.open}>
			<AlertDialogContent
				className="sm:max-w-4xl"
				onEscapeKeyDown={handleEscapeKeyDown}
				{...dragHandlers}
			>
				{isDragging && <DropOverlay className="rounded-lg" />}
				<AlertDialogHeader>
					<AlertDialogTitle className="text-lg">
						{props.adding && addError.length === 0
							? "Adding..."
							: "Add a new card"}
					</AlertDialogTitle>

					<Tabs
						value={activeTab}
						onValueChange={(value) => setActiveTab(value as AddDialogTab)}
						className="gap-4"
					>
						<TabsList aria-label="Add card views">
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="flow">Flow</TabsTrigger>
						</TabsList>

						<TabsContent value="details" className="mt-0">
							<div className="flex flex-col space-y-3">
								<GhCardXmlPaste
									xmlData={xmlData}
									setXmlData={setXmlData}
									isValidXml={isValidXml}
									xmlError={addError}
									setXmlError={setAddError}
									handlePasteFromClipboard={handlePasteFromClipboard}
									handleFileSelected={handleFileSelected}
									onClearPastedXml={handleClearPastedXml}
								/>
								<div className="flex flex-col gap-y-1.5">
									<Input
										type="text"
										name="name"
										placeholder="NameOfGhCardInPascalCase"
										className="font-semibold"
										maxLength={30}
										value={name}
										onChange={(e) => handleNameChange(e.target.value)}
										disabled={props.adding}
										autoComplete="off"
									/>
									<p className="w-full text-right text-xs text-wrap text-neutral-700">
										{name.length || 0} / 30 characters
									</p>
								</div>
								<div className="flex flex-col gap-y-1.5">
									<Textarea
										name="description"
										placeholder="Type your description here."
										maxLength={150}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										disabled={props.adding}
										autoComplete="off"
									/>
									<p className="text-right text-xs text-neutral-700">
										{description.length || 0} / 150 characters
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{tags.map((tag, i) => (
										<AddGhTagDisplay
											key={`tag-${i}-${tag}`}
											tag={tag}
											handleDeleteTag={deleteTag}
										/>
									))}

									<div className="flex w-full max-w-3xs items-center gap-2">
										<Input
											type="text"
											name="tag"
											placeholder="Add a tag"
											maxLength={20}
											onChange={(e) => {
												onTagValueChange(e.target.value);
											}}
											autoComplete="off"
											disabled={props.adding}
											value={tag}
											onKeyDown={(e) => {
												if (e.key === "Enter" && tag.length > 0) {
													handleAddTag(tag);
												}
											}}
										/>
										<Button
											type="submit"
											variant="outline"
											onClick={() => handleAddTag(tag)}
										>
											Add
										</Button>
									</div>
								</div>
								{availableTags.length > 0 && (
									<div className="flex flex-wrap items-center gap-2">
										{availableTags.map((tag, i) => (
											<AvailableGhTagDisplay
												key={`availableTag-${i}-${tag}`}
												tag={tag}
												handleAddTag={handleAddTag}
											/>
										))}
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value="flow" className="mt-0 h-[55vh] min-h-80">
							<GhFlowView
								nodes={flowPreview?.nodes ?? []}
								edges={flowPreview?.edges ?? []}
								emptyMessage={
									xmlData && isValidXml
										? "This script does not contain any flow data."
										: "Import valid Grasshopper XML to preview its flow."
								}
							/>
						</TabsContent>
					</Tabs>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						disabled={props.adding}
						onClick={() => handleCancel()}
					>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => handleSubmit()}
						disabled={!isValid || props.adding || xmlData === undefined}
					>
						Add
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
