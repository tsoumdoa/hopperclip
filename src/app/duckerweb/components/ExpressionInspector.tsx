import { Asterisk } from "lucide-react";
import {
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
	EXPRESSION_HOVER_DELAY_MS,
	expressionPopupReducer,
	isExpressionPopupOpen,
	type ExpressionPopupMode,
} from "./expression-popup-state";

type Side = "top" | "right" | "bottom" | "left";

function popupStyleForSide(rect: DOMRect, side: Side): CSSProperties {
	const gap = 6;
	switch (side) {
		case "top":
			return {
				top: rect.top - gap,
				left: rect.left + rect.width / 2,
				transform: "translate(-50%, -100%)",
			};
		case "bottom":
			return {
				top: rect.bottom + gap,
				left: rect.left + rect.width / 2,
				transform: "translate(-50%, 0)",
			};
		case "left":
			return {
				top: rect.top + rect.height / 2,
				left: rect.left - gap,
				transform: "translate(-100%, -50%)",
			};
		case "right":
			return {
				top: rect.top + rect.height / 2,
				left: rect.right + gap,
				transform: "translate(0, -50%)",
			};
		default: {
			const _exhaustive: never = side;
			return _exhaustive;
		}
	}
}

export function ExpressionInspector({
	expression,
	trigger,
	className,
	side = "top",
}: {
	expression: string;
	trigger?: ReactNode;
	className?: string;
	side?: Side;
}) {
	const [mode, dispatch] = useReducer(
		expressionPopupReducer,
		"closed" satisfies ExpressionPopupMode
	);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const popupRef = useRef<HTMLDivElement | null>(null);
	const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [coords, setCoords] = useState<CSSProperties | null>(null);
	const open = isExpressionPopupOpen(mode);

	const clearHoverTimers = useEffectEvent(() => {
		if (hoverOpenTimerRef.current !== null) {
			clearTimeout(hoverOpenTimerRef.current);
			hoverOpenTimerRef.current = null;
		}
		if (hoverCloseTimerRef.current !== null) {
			clearTimeout(hoverCloseTimerRef.current);
			hoverCloseTimerRef.current = null;
		}
	});

	useEffect(() => clearHoverTimers, [clearHoverTimers]);

	const scheduleHoverOpen = () => {
		clearHoverTimers();
		hoverOpenTimerRef.current = setTimeout(() => {
			dispatch({ type: "hover-start" });
			hoverOpenTimerRef.current = null;
		}, EXPRESSION_HOVER_DELAY_MS);
	};

	const scheduleHoverClose = () => {
		clearHoverTimers();
		hoverCloseTimerRef.current = setTimeout(() => {
			dispatch({ type: "hover-end" });
			hoverCloseTimerRef.current = null;
		}, 80);
	};

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) {
			setCoords(null);
			return;
		}

		const update = () => {
			if (!triggerRef.current) return;
			setCoords(
				popupStyleForSide(triggerRef.current.getBoundingClientRect(), side)
			);
		};

		update();
		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
		};
	}, [open, side, expression]);

	useEffect(() => {
		if (mode !== "pinned") return;

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
			if (triggerRef.current?.contains(target)) return;
			if (popupRef.current?.contains(target)) return;
			clearHoverTimers();
			dispatch({ type: "dismiss" });
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				clearHoverTimers();
				dispatch({ type: "dismiss" });
			}
		};

		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [mode, clearHoverTimers]);

	const popup =
		open && coords && typeof document !== "undefined"
			? createPortal(
					<div
						ref={popupRef}
						role="dialog"
						aria-label="Expression"
						data-expression-popup=""
						className="z-[100] w-auto max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md border border-[#333] bg-[#1e1e1e] p-2 text-[#f2f2f2] shadow-lg"
						style={{ position: "fixed", ...coords }}
						onMouseEnter={() => {
							if (mode === "pinned") return;
							clearHoverTimers();
							dispatch({ type: "hover-start" });
						}}
						onMouseLeave={() => {
							if (mode === "pinned") return;
							scheduleHoverClose();
						}}
					>
						<div className="mb-1 text-[10px] font-medium tracking-wide text-[#b0b0b0] uppercase">
							Expression
						</div>
						<code
							data-expression-formula=""
							className="block max-h-40 overflow-auto font-mono text-[11px] leading-snug break-words whitespace-pre-wrap select-text"
						>
							{expression}
						</code>
					</div>,
					document.body
				)
			: null;

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				className={cn(
					"nodrag nopan flex size-3.5 items-center justify-center rounded-[3px] bg-[#444] text-[#f2f2f2]",
					className
				)}
				data-port-option="expression"
				data-expression-trigger=""
				aria-label={`Expression: ${expression}`}
				aria-expanded={open}
				onMouseEnter={() => {
					if (mode === "pinned") return;
					scheduleHoverOpen();
				}}
				onMouseLeave={() => {
					if (mode === "pinned") return;
					scheduleHoverClose();
				}}
				onFocus={() => {
					if (mode === "pinned") return;
					scheduleHoverOpen();
				}}
				onBlur={() => {
					if (mode === "pinned") return;
					scheduleHoverClose();
				}}
				onClick={(event) => {
					event.stopPropagation();
					clearHoverTimers();
					dispatch({ type: "click-trigger" });
				}}
				onPointerDown={(event) => {
					// Keep React Flow from starting a node drag on badge press.
					event.stopPropagation();
				}}
			>
				{trigger ?? <Asterisk size={9} strokeWidth={2.5} />}
			</button>
			{popup}
		</>
	);
}
