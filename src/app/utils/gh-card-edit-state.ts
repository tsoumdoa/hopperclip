export function updateEditingCardIds(
	current: Set<string>,
	cardId: string,
	editMode: boolean
): Set<string> {
	if (current.has(cardId) === editMode) return current;

	const next = new Set(current);
	if (editMode) {
		next.add(cardId);
	} else {
		next.delete(cardId);
	}
	return next;
}
