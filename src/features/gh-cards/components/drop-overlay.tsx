import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Semi-transparent overlay rendered inside a `relative` / `fixed` container
 * to indicate that a file drop is active. Visual style mirrors the DuckerWeb
 * drop overlay: dark backdrop with blur, emerald dashed border, icon badge.
 *
 * The parent element should be `relative` (or `fixed`) and should have a
 * matching `rounded-*` class so the overlay's corners align. Pass the same
 * rounding via `className` (defaults to `rounded-lg`); the inner dashed
 * border inherits the same radius via `rounded-[inherit]`.
 */
export function DropOverlay({
	text = "Drop .gh or .ghx here",
	hint = "Release to import",
	className,
}: {
	text?: string;
	hint?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-lg bg-neutral-950/85 backdrop-blur-md",
				className
			)}
			aria-hidden
		>
			<div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[inherit] border-2 border-dashed border-emerald-500/40 p-3">
				<div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
					<FileUp className="h-4 w-4 text-emerald-300" />
				</div>
				<p className="text-sm font-semibold text-neutral-100">{text}</p>
				{hint && <p className="text-xs text-neutral-400">{hint}</p>}
			</div>
		</div>
	);
}
