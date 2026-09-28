export function formatTimeDiff(date: Date, now = new Date()) {
	const diff = now.getTime() - date.getTime();
	if (Number.isNaN(diff)) return "";
	const minutes = Math.floor(diff / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	if (weeks < 5) return `${weeks}w ago`;
	return date.toLocaleString("en-US", {
		day: "numeric",
		month: "short",
		...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
	});
}
