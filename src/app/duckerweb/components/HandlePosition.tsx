import type { GHHandlePositionProps } from "../types/type";

export function HandlePosition({
	position,
	children,
	className = "",
	top = "50%",
}: GHHandlePositionProps) {
	const isLeft = position === "left";

	return (
		<div
			className={`pointer-events-none absolute flex items-center ${isLeft ? "left-0" : "right-0 justify-end"} ${className}`}
			style={{ top, transform: "translateY(-50%)" }}
		>
			{children}
		</div>
	);
}
