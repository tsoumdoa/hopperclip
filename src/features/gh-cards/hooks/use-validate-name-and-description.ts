import { GhCardSchema, UserTag } from "@/types/types";
import { useEffect, useState } from "react";
import Fuse from "fuse.js";

const fuseOptions = {
	keys: [],
	includeScore: true,
	threshold: 0.4,
	ignoreLocation: true,
	ignoreCase: true,
};

export const useValidateNameDescriptionAndTags = (
	setAddError: (s: string) => void,
	userTags: UserTag[]
) => {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [tag, setTag] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [availableTags, setAvailableTags] = useState<string[]>([]);
	const [isValid, setIsValid] = useState(false);
	const currentTags = userTags.map((userTag) => userTag.tag);
	const fuse = new Fuse(currentTags, fuseOptions);

	const handleAddTag = (tag: string) => {
		const trimedTag = tag.trim();

		if (trimedTag.length > 20) {
			setAddError("Tag is too long");
			setTimeout(() => {
				setAddError("");
			}, 900);
			return false;
		}
		if (trimedTag.length === 0) {
			setAddError("Tag cannot be empty");
			setTimeout(() => {
				setAddError("");
			}, 900);
			return false;
		}
		if (tags.includes(trimedTag)) {
			setAddError("Tag already exists");
			setTimeout(() => {
				setAddError("");
			}, 900);
			return false;
		}
		if (trimedTag === " ") {
			setAddError("Tag cannot be empty");
			setTimeout(() => {
				setAddError("");
			}, 900);
			return false;
		}
		// no special characters
		if (trimedTag.match(/[^\p{L}\p{N}]/u)) {
			setAddError("Tag cannot contain special characters");
			setTimeout(() => {
				setAddError("");
			}, 900);
			return false;
		}
		const newTags = new Set([...tags, trimedTag]);
		setTags([...newTags]);
		setTag("");
		setAvailableTags([]);
		return true;
	};

	const deleteTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag));
	};
	const addTag = (tag: string) => {
		const newTags = new Set([...tags, tag]);
		const array = [...newTags];
		setTags(array);
	};

	const onTagValueChange = (t: string) => {
		setTag(t);
		const matches = fuse.search(t);
		const tagMatch = matches.map((m) => m.item);

		//don't show it if it is already in tags
		const filteredAvailableTags = tagMatch.filter((t) => !tags.includes(t));
		setAvailableTags(filteredAvailableTags);
	};

	useEffect(() => {
		try {
			GhCardSchema.parse({ name: name, description: description, tags: tags });
			setIsValid(true);
		} catch {
			setIsValid(false);
			return;
		}
	}, [name, description, tags]);

	return {
		name,
		setName,
		description,
		setDescription,
		isValid,
		tag,
		setTag,
		tags,
		setTags,
		handleAddTag,
		addTag,
		deleteTag,
		onTagValueChange,
		availableTags,
		setAvailableTags,
	};
};
