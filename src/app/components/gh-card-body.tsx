import { Textarea } from "@/components/ui/textarea";
import { GhCard } from "@/types/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useValidateNameDescriptionAndTags } from "../hooks/use-validate-name-and-description";
import { AvailableGhTagDisplay } from "./add-gh-tag-display";
import { GhCardXmlPaste } from "./gh-card-xml-paste";
import { useQuery } from "convex/react";
import { api as convex } from "../../../convex/_generated/api";

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
	titleAdornment?: React.ReactNode;
	tagsSlot?: React.ReactNode;
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

	if (!props.editMode) {
		const hasDescription = props.ghInfo.description.length > 0;
		return (
			<div className="flex w-full flex-1 flex-col">
				<div className="flex items-start justify-between gap-3">
					<h3
						className="min-w-0 truncate text-base font-semibold text-neutral-50"
						title={props.ghInfo.name}
					>
						{props.ghInfo.name}
					</h3>
					{props.titleAdornment}
				</div>
				<p
					className={`mt-1 line-clamp-3 text-sm leading-relaxed break-words ${hasDescription ? "text-neutral-400" : "text-neutral-600 italic"}`}
				>
					{hasDescription ? props.ghInfo.description : "No description"}
				</p>
				{props.tagsSlot && <div className="mt-3">{props.tagsSlot}</div>}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-1 flex-col gap-4">
			<FieldLabel label="Name" counter={`${props.ghInfo.name.length || 0}/30`}>
				<Input
					type="name"
					placeholder="NameOfGhCardInPascalCase"
					className="font-semibold"
					defaultValue={props.ghInfo.name}
					onChange={(e) =>
						props.setGhInfo({ ...props.ghInfo, name: e.target.value })
					}
				/>
			</FieldLabel>
			<FieldLabel
				label="Description"
				counter={`${props.ghInfo.description?.length || 0}/150`}
			>
				<Textarea
					placeholder="What does this definition do?"
					maxLength={150}
					defaultValue={props.ghInfo.description}
					onChange={(e) =>
						props.setGhInfo({
							...props.ghInfo,
							description: e.target.value,
						})
					}
				/>
			</FieldLabel>
			<div className="flex flex-col gap-2">
				<span className="text-xs font-medium text-neutral-400">Tags</span>
				{props.tagsSlot}
				<div className="flex w-full items-center gap-2">
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
						variant="secondary"
						onClick={() => {
							const isValid = validateTag(props.tag);
							if (isValid) {
								props.addTag(props.tag);
							}
						}}
					>
						Add
					</Button>
				</div>
				{availableTags.length > 0 && (
					<div className="flex flex-wrap items-center gap-1.5">
						{availableTags.map((t, i) => (
							<AvailableGhTagDisplay
								key={`availableTag-${i}-${t}`}
								tag={t}
								handleAddTag={props.addTag}
							/>
						))}
					</div>
				)}
				{addError.length > 0 && (
					<p className="text-sm text-red-400">{addError}</p>
				)}
			</div>
			<div className="flex flex-col gap-2">
				<span className="text-xs font-medium text-neutral-400">
					Replace GhXml
				</span>
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
		</div>
	);
}

function FieldLabel(props: {
	label: string;
	counter: string;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="flex items-baseline justify-between text-xs">
				<span className="font-medium text-neutral-400">{props.label}</span>
				<span className="text-neutral-600 tabular-nums">{props.counter}</span>
			</span>
			{props.children}
		</label>
	);
}
