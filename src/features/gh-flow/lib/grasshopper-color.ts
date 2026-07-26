export function grasshopperArgbToCss(
	argb: string | undefined,
	fallback: string
): string {
	if (!argb) return fallback;

	const channels = argb.split(";").map(Number);
	if (
		channels.length !== 4 ||
		channels.some((channel) => !Number.isFinite(channel))
	) {
		return fallback;
	}

	const [alpha, red, green, blue] = channels.map((channel) =>
		Math.max(0, Math.min(255, channel))
	);

	return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}
