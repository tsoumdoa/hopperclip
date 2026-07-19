import { Handle, Position } from "@xyflow/react";
import { HANDLE_SIZE, HANDLE_STROKE } from "./constants";
import type { GHHandleProps } from "../types/type";

export function GHHandle({
	variant,
	position,
	type,
	id,
	className = "",
}: GHHandleProps) {
	if (variant === "compact") {
		return (
			<Handle
				type={type}
				position={position === "left" ? Position.Left : Position.Right}
				id={id}
				className={`!h-[9px] !w-[9px] !rounded-full !border !bg-[#aaa] ${className}`}
				style={{
					borderColor: HANDLE_STROKE,
					clipPath: "inset(0 0 0 50%)",
				}}
			/>
		);
	}

	const borderRadius = type === "target" ? "50%" : "80%";
	const transform =
		position === "left" ? "translateX(-50%)" : "translateX(50%)";

	return (
		<Handle
			type={type}
			position={position === "left" ? Position.Left : Position.Right}
			id={id}
			className={`pointer-events-auto relative! top-auto! left-auto! translate-x-0! translate-y-0! ${className}`}
			style={{
				width: HANDLE_SIZE,
				height: HANDLE_SIZE,
				flexShrink: 0,
				borderRadius,
				border: `2.2px solid ${HANDLE_STROKE}`,
				background: "#fff",
				clipPath:
					Position.Left === position ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
				transform,
			}}
		/>
	);
}
