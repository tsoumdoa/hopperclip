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

/** Shared product framing used across review variants */
export function ProductContrast({
	emphasis = "clip",
}: {
	emphasis?: "clip" | "ducker" | "equal";
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<div
				className={cn(
					"rounded-xl border p-5 transition-colors",
					emphasis === "ducker"
						? "border-neutral-800 bg-neutral-950/60"
						: "border-neutral-600 bg-neutral-900"
				)}
			>
				<p className="text-[11px] tracking-[0.16em] text-neutral-500 uppercase">
					Hopper Clip
				</p>
				<p className="mt-2 text-lg font-semibold text-white">
					Online pastebin for Grasshopper
				</p>
				<p className="mt-2 text-sm leading-relaxed text-neutral-400">
					Save definitions to your account, organize with tags, and share a link
					— so scripts live online instead of in file attachments.
				</p>
			</div>
			<div
				className={cn(
					"rounded-xl border p-5 transition-colors",
					emphasis === "clip"
						? "border-neutral-800 bg-neutral-950/60"
						: "border-neutral-600 bg-neutral-900"
				)}
			>
				<p className="text-[11px] tracking-[0.16em] text-neutral-500 uppercase">
					DuckerWeb
				</p>
				<p className="mt-2 text-lg font-semibold text-white">
					Local-first .gh file inspector
				</p>
				<p className="mt-2 text-sm leading-relaxed text-neutral-400">
					Open a file in your browser to see the graph, list components, diff
					two versions, and inspect expressions — nothing is uploaded unless you
					choose to save a card.
				</p>
			</div>
		</div>
	);
}
