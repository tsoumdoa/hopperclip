export function formatTimeDiff(date: Date) {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	if (diff < 0) return "already expired";
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	const months = Math.floor(weeks / 4);
	if (seconds <= 60) {
		return `${seconds.toFixed(0)} ${seconds.toFixed(0) === "1" ? "second" : "seconds"} ago`;
	} else if (minutes < 60) {
		return `${minutes.toFixed(0)} ${minutes.toFixed(0) === "1" ? "minute" : "minutes"} ago`;
	} else if (hours < 24) {
		return `${hours.toFixed(1)} ${hours <= 1 ? "hour" : "hours"} ago`;
	} else if (days < 7) {
		return `${days.toFixed(1)} ${days <= 1 ? "day" : "days"} ago`;
	} else if (weeks < 30) {
		return `${weeks.toFixed(1)} ${weeks <= 1 ? "week" : "weeks"} ago`;
	} else if (months < 12) {
		return `${months.toFixed(1)} ${months <= 1 ? "month" : "months"} ago`;
	} else {
		return date.toLocaleString("en-US", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	}
}
