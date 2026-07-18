import type { ReactNode } from "react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { cn } from "@/lib/utils";

export function LandingShell({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"min-h-screen bg-black font-sans text-white antialiased",
				className
			)}
		>
			<div className="mx-auto flex min-h-screen max-w-400 flex-col p-4 md:px-6 md:pt-6 md:pb-2">
				<Header />
				{children}
				<Footer />
			</div>
		</div>
	);
}
