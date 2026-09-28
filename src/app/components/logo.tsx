import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hover animation is driven by a `group` ancestor (e.g. the header link). */
export function LogoMark({ className }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-green-300 text-neutral-900 shadow-[0_0_24px_-6px] shadow-green-300/60 transition-shadow duration-300 group-hover:shadow-[0_0_28px_-4px] group-hover:shadow-green-300/80",
				className
			)}
		>
			<Paperclip
				className="size-4 -rotate-45 motion-safe:group-hover:animate-[clip-wiggle_0.7s_ease-in-out]"
				strokeWidth={2.5}
			/>
		</span>
	);
}
