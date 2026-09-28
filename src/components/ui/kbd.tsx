import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/10 bg-white/[0.06] px-1 font-mono text-[11px] font-medium text-neutral-300 select-none",
				className
			)}
			{...props}
		/>
	);
}

export { Kbd };
