import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Footer from "./footer";
import Header from "./header";

export function PageShell({
	children,
	className,
	footer = true,
}: {
	children: ReactNode;
	className?: string;
	footer?: boolean;
}) {
	return (
		<div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
			<div
				className={cn(
					"mx-auto flex w-full max-w-400 flex-1 flex-col px-4 min-[2200px]:px-16 md:px-6 2xl:px-10",
					className
				)}
			>
				<Header />
				<main className="flex flex-1 flex-col">{children}</main>
				{footer && <Footer />}
			</div>
		</div>
	);
}
