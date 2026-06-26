import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api as convex } from "../../../convex/_generated/api";
import { GhPost } from "@/types/types";
import { deleteFromBucket, uploadToBucket } from "@/server/r2-storage";
import { compress } from "../utils/gzip";
import { useXmlPasteHandler } from "../components/gh-card-xml-paste";
import { nanoid } from "nanoid";

export default function useGhCardControl(cardInfo: GhPost) {
	const deletePostConvex = useMutation(convex.ghCard.deletePost);
	const updatePost = useMutation(convex.ghCard.updatePost);

	const [tag, setTag] = useState<string>("");
	const [editMode, setEditMode] = useState(false);
	const [invalidInput, setInvalidInput] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [deleted, setDeleted] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [ghInfo, setGhInfo] = useState({
		name: cardInfo.name,
		description: cardInfo.description ?? "",
		tags: cardInfo.tags ?? [],
	});
	const [reset, setReset] = useState(false);
	const prevTags = useRef(cardInfo.tags ?? []);
	const newTags = useRef(cardInfo.tags ?? []);
	const [newXmlData, setNewXmlData] = useState<string | undefined>();
	const [isValidXml, setIsValidXml] = useState(false);
	const [xmlError, setXmlError] = useState("");

	const { handlePasteFromClipboard } = useXmlPasteHandler(
		setNewXmlData,
		setIsValidXml,
		setXmlError
	);

	const handleCancelEditMode = () => {
		setReset(true);
		setEditMode(false);
		setTag("");
		setNewXmlData(undefined);
		setIsValidXml(false);
		setXmlError("");
		setGhInfo({
			name: cardInfo.name,
			description: cardInfo.description ?? "",
			tags: cardInfo.tags ?? [],
		});
	};

	const deletePost = async () => {
		setDeleting(true);
		setDeleteError(null);
		//TEMP for testing delete error
		// setDeleteError("Failed to delete. Please try again.");
		// setDeleting(false);
		// throw new Error("Test error");
		try {
			await deletePostConvex({ id: cardInfo["_id"] });
			await deleteFromBucket({ data: cardInfo.bucketUrl! });
			setTag("");
			setEditMode(false);
			setDeleted(true);
		} catch (error) {
			console.error("Failed to delete post:", error);
			setDeleteError("Failed to delete. Please try again.");
		} finally {
			setDeleting(false);
		}
	};

	const handleEdit = async (submit: boolean) => {
		setReset(true);

		const metadataChanged =
			ghInfo.name !== cardInfo.name ||
			ghInfo.description !== cardInfo.description ||
			newTags.current !== prevTags.current;

		const xmlChanged = newXmlData !== undefined;

		if (!submit) {
			setEditMode(false);
			return;
		}

		if (xmlChanged && !isValidXml) {
			setXmlError("Please fix XML errors before saving");
			return;
		}

		setEditMode(false);
		setUpdating(true);

		if (xmlChanged && isValidXml) {
			const newBucketUrl = nanoid();
			try {
				const compressed = compress(newXmlData);
				await uploadToBucket({
					data: {
						nanoId: newBucketUrl,
						ghXmlZipped: Array.from(compressed),
					},
				});
				await updatePost({
					id: cardInfo["_id"],
					name: ghInfo.name!,
					description: ghInfo.description!,
					tags: newTags.current,
					uid: newBucketUrl,
				});
				await deleteFromBucket({ data: cardInfo.bucketUrl! });
			} catch (error) {
				setXmlError("Failed to update XML: " + String(error));
				setEditMode(true);
				setUpdating(false);
				return;
			}
			setEditMode(false);
			setNewXmlData(undefined);
			setIsValidXml(false);
			setUpdating(false);
			return;
		}

		if (metadataChanged || xmlChanged) {
			try {
				await updatePost({
					id: cardInfo["_id"],
					name: ghInfo.name!,
					description: ghInfo.description!,
					tags: newTags.current,
				});
			} catch (error) {
				setXmlError("Failed to save: " + String(error));
				setEditMode(true);
				setUpdating(false);
				return;
			}
		}

		setEditMode(false);
		setNewXmlData(undefined);
		setIsValidXml(false);
		setXmlError("");
		setUpdating(false);
	};

	const removeTag = (tag: string, toBeRemoved: boolean) => {
		if (!toBeRemoved) {
			const filteredTags = prevTags.current.filter((t) => t !== tag);
			newTags.current = filteredTags;
		} else {
			newTags.current = [...prevTags.current, tag];
		}
	};

	const addTag = (t: string) => {
		const newTagSet = new Set([...newTags.current, t]);
		const array = [...newTagSet];
		newTags.current = array;
		setGhInfo({ ...ghInfo, tags: array });
		setTag("");
	};

	return {
		editMode,
		setEditMode,
		handleEdit,
		deletePost,
		ghInfo,
		setGhInfo,
		invalidInput,
		setInvalidInput,
		updating,
		setUpdating,
		deleted,
		setDeleted,
		deleting,
		setDeleting,
		deleteError,
		setDeleteError,
		removeTag,
		addTag,
		prevTags,
		handleCancelEditMode,
		tag,
		setTag,
		reset,
		setReset,
		newXmlData,
		setNewXmlData,
		isValidXml,
		xmlError,
		setXmlError,
		handlePasteFromClipboard,
	};
}
