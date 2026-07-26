import { Textarea } from "@/components/ui/textarea";
import { GhCard } from "@/types/types";
import { Input } from "@/components/ui/input";
import { DateDisplay } from "./gh-card-date-display";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useValidateNameDescriptionAndTags } from "../hooks/use-validate-name-and-description";
import { AvailableGhTagDisplay } from "./add-gh-tag-display";
import { GhCardXmlPaste } from "./gh-card-xml-paste";
import { useQuery } from "convex/react";
import { api as convex } from "@convex/_generated/api";

export function NameDescriptionAndTags(props: {
	editMode: boolean;
	setEditMode: () => void;
	setGhInfo: (ghInfo: GhCard) => void;
	ghInfo: GhCard;
	// DEPRECATED: Not used anymore, kept for compatibility
	isShared?: boolean;
	// DEPRECATED: Not used anymore, kept for compatibility
	expiryDate?: string;
	bucketId: string;
	lastEdited: string | undefined;
	created: string | undefined;
	addTag: (tag: string) => void;
	tag: string;
	setTag: (t: string) => void;
	reset: boolean;
	setReset: (b: boolean) => void;
	newXmlData: string | undefined;
	setNewXmlData: (data: string | undefined) => void;
	isValidXml: boolean;
	xmlError: string;
	setXmlError: (error: string) => void;
	handlePasteFromClipboard: () => void;
	handleFileSelected: (file: File) => void;
}) {
	const userTags = useQuery(convex.ghCard.getUserTags, {});
	const [addError, setAddError] = useState("");
	const {
		onTagValueChange,
		handleAddTag: validateTag,
		availableTags,
		setAvailableTags: setAvailableTagsDisplay,
		setTags: setAvailableTags,
	} = useValidateNameDescriptionAndTags(setAddError, userTags ?? []);

	useEffect(() => {
		setAvailableTags(props.ghInfo.tags ?? []);
	}, [props.ghInfo.tags, setAvailableTags]);

	useEffect(() => {
		if (props.reset) {
			props.setReset(false);
			setAddError("");
			setAvailableTags([]);
			setAvailableTagsDisplay([]);
		}
	}, [props.reset, setAvailableTags, setAvailableTagsDisplay, props]);

	return (
		<div className="w-full">
			<div className="items-top flex w-full flex-row justify-between gap-2">
				<div className="text-truncate w-full">
					<p
						className={` ${props.editMode ? "text-neutral-900" : "text-neutral-500"} pb-1`}
					>
						Name
					</p>
					<div
						className={`pb-1 text-lg ${props.editMode ? "" : "font-semibold"} text-truncate w-full transition-all`}
					>
						{props.editMode ? (
							<div className="space-y-1">
								<Input
									type="name"
									placeholder="NameOfGhCardInPascalCase"
									className="font-semibold"
									defaultValue={props.ghInfo.name}
									onChange={(e) =>
										props.setGhInfo({ ...props.ghInfo, name: e.target.value })
									}
								/>
								<p className="w-full text-right text-xs text-wrap text-neutral-100">
									{props.ghInfo.name.length || 0} / 30 characters
								</p>
							</div>
						) : (
							<p className="overflow-hidden text-ellipsis">
								{props.ghInfo.name}
							</p>
						)}
					</div>
				</div>
			</div>
			<p
				className={` ${props.editMode ? "text-neutral-900" : "text-neutral-500"} pb-1`}
			>
				Description
			</p>
			<div className="h-auto pb-1 text-neutral-100">
				{props.editMode ? (
					<div className="space-y-1">
						<Textarea
							placeholder="Type your message here."
							maxLength={150}
							defaultValue={props.ghInfo.description}
							onChange={(e) =>
								props.setGhInfo({
									...props.ghInfo,
									description: e.target.value,
								})
							}
						/>
						<p className="text-right text-xs text-neutral-100">
							{props.ghInfo.description?.length || 0} / 150 characters
						</p>
					</div>
				) : (
					<p className="overflow-hidden text-ellipsis">
						{props.ghInfo.description.length > 0
							? props.ghInfo.description
							: "-"}
					</p>
				)}
			</div>
			{props.editMode && (
				<div>
					<p
						className={` ${props.editMode ? "text-neutral-900" : "text-neutral-500"} pb-1`}
					>
						Add Tags
					</p>

					<div className="flex w-full max-w-3xs items-center gap-2 pb-2">
						<Input
							type="text"
							name="tag"
							placeholder="Add a tag"
							maxLength={20}
							onChange={(e) => {
								props.setTag(e.target.value);
								onTagValueChange(e.target.value);
							}}
							autoComplete="off"
							value={props.tag}
							onKeyDown={(e) => {
								if (e.key === "Enter" && props.tag.length > 0) {
									const isValid = validateTag(props.tag);
									if (isValid) {
										props.addTag(props.tag);
									}
								}
							}}
						/>
						<Button
							type="submit"
							variant="default"
							onClick={() => {
								const isValid = validateTag(props.tag);
								if (isValid) {
									props.addTag(props.tag);
								}
							}}
							className="bg-neutral-800 font-semibold text-neutral-100 hover:bg-neutral-700"
						>
							Add
						</Button>
					</div>
					{availableTags.length > 0 && (
						<div className="flex flex-wrap items-center gap-2 py-1">
							{availableTags.map((t, i) => (
								<AvailableGhTagDisplay
									key={`availableTag-${i}-${t}`}
									tag={t}
									handleAddTag={props.addTag}
								/>
							))}
						</div>
					)}
					{addError.length > 0 && <p className="text-red-800">{addError}</p>}
				</div>
			)}
			{props.editMode && (
				<div className="py-3">
					<GhCardXmlPaste
						xmlData={props.newXmlData}
						setXmlData={props.setNewXmlData}
						isValidXml={props.isValidXml}
						xmlError={props.xmlError}
						setXmlError={props.setXmlError}
						handlePasteFromClipboard={props.handlePasteFromClipboard}
						handleFileSelected={props.handleFileSelected}
						isEditMode={true}
					/>
				</div>
			)}

			{!props.editMode && (
				<DateDisplay
					createdDate={props.created}
					lastModDate={props.lastEdited}
				/>
			)}
		</div>
	);
}
