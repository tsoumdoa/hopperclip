import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrimarySignUp({
	label = "Get Started Free",
	className,
}: {
	label?: string;
	className?: string;
}) {
	return (
		<SignUpButton mode="modal">
			<button
				type="button"
				className={cn(
					"inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200",
					className
				)}
			>
				{label}
				<ArrowRight className="h-4 w-4" />
			</button>
		</SignUpButton>
	);
}

export function SecondaryDuckerLink({
	label = "Open DuckerWeb",
	className,
}: {
	label?: string;
	className?: string;
}) {
	return (
		<Link
			to="/duckerweb"
			className={cn(
				"inline-flex items-center gap-2 rounded-md border border-neutral-600 px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-900",
				className
			)}
		>
			{label}
			<ArrowRight className="h-4 w-4" />
		</Link>
	);
}
