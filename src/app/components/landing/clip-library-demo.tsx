import { Check, Copy, Link2, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ThumbnailPreview } from "@/app/components/gh-card-preview";
import { cn } from "@/lib/utils";
import { SAMPLE_PREVIEWS } from "./sample-previews";

const SAMPLE_CLIPS = [
	{
		id: "facade",
		name: "ParametricFacade",
		description: "Attractor-driven perforations across a panel grid",
		tags: ["architecture", "facade"],
		edited: "Edited 2d ago",
		copies: 24,
		shared: true,
	},
	{
		id: "curve",
		name: "DisplayCurveLength",
		description: "C# script that labels curves with formatted lengths",
		tags: ["analysis"],
		edited: "Created 3w ago",
		copies: 19,
		shared: false,
	},
	{
		id: "solar",
		name: "SolarRadiationGrid",
		description: "Annual radiation mapped onto a roof mesh",
		tags: ["analysis", "ladybug"],
		edited: "Edited 5d ago",
		copies: 12,
		shared: false,
	},
	{
		id: "voronoi",
		name: "VoronoiPattern",
		description: "Surface subdivision with attractor points",
		tags: ["geometry"],
		edited: "Created 1w ago",
		copies: 9,
		shared: false,
	},
] as const;

type Clip = (typeof SAMPLE_CLIPS)[number];
type ClipId = Clip["id"];

/** Library grid for the hero: real card layout, real thumbnail band. */
export function ClipLibraryGrid() {
	return (
		<div className="relative">
			<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{SAMPLE_CLIPS.map((clip, i) => (
					<li key={clip.id} className={cn(i >= 2 && "hidden sm:block")}>
						<DemoCard clip={clip} compact />
					</li>
				))}
			</ul>
			{/* The library keeps going — fade the second row out. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-neutral-950"
			/>
		</div>
	);
}

/** One interactive card: copy bumps the count, share reveals a link. */
export function ClipCardDemo({
	mode,
	clipId,
}: {
	mode: "copy" | "share";
	clipId: ClipId;
}) {
	const clip = SAMPLE_CLIPS.find((c) => c.id === clipId) ?? SAMPLE_CLIPS[0];
	const [copies, setCopies] = useState<number>(clip.copies);
	const [copied, setCopied] = useState(false);
	const [shared, setShared] = useState(false);
	const [linkShown, setLinkShown] = useState(false);
	const timer = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	const flash = (set: (v: boolean) => void, ms: number) => {
		set(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => set(false), ms);
	};

	return (
		<div className="relative">
			<DemoCard
				clip={clip}
				copies={copies}
				shared={shared}
				copied={copied}
				highlight={mode}
				onCopy={() => {
					setCopies((n) => n + 1);
					flash(setCopied, 1800);
				}}
				onShare={() => {
					setShared(true);
					flash(setLinkShown, 2800);
				}}
			/>
			<AnimatePresence>
				{linkShown && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
						className="absolute inset-x-0 -bottom-12 flex justify-center"
					>
						<div className="rounded-md border border-green-300/30 bg-neutral-950 px-3 py-2 font-mono text-xs text-green-300">
							hopperclip.com/share?…
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/**
 * Static mirror of GHCard (gh-card.tsx). Kept free of Convex/Clerk so it can
 * render signed out — keep the classes roughly in step with the real card.
 */
function DemoCard(props: {
	clip: Clip;
	/** Narrow grid cell: drop the date so the footer fits. */
	compact?: boolean;
	copies?: number;
	shared?: boolean;
	copied?: boolean;
	highlight?: "copy" | "share";
	onCopy?: () => void;
	onShare?: () => void;
}) {
	const { clip } = props;
	const copies = props.copies ?? clip.copies;
	const shared = props.shared ?? clip.shared;
	const interactive = props.highlight !== undefined;

	return (
		<div className="group bg-card relative flex flex-col rounded-xl border border-white/[0.08] p-4 transition-colors hover:border-white/20 hover:bg-neutral-900">
			<ThumbnailPreview data={SAMPLE_PREVIEWS[clip.id]} />
			<div className="flex items-start justify-between gap-3">
				<h3 className="min-w-0 truncate text-base font-semibold text-neutral-50">
					{clip.name}
				</h3>
				{shared && (
					<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-300/10 px-2 py-0.5 text-[11px] font-semibold text-green-300 ring-1 ring-green-300/30 ring-inset">
						<span className="size-1.5 rounded-full bg-green-300" />
						Shared
					</span>
				)}
			</div>
			<p className="mt-1 line-clamp-1 text-sm leading-relaxed text-neutral-400">
				{clip.description}
			</p>
			<div className="mt-3 flex flex-wrap gap-1.5">
				{clip.tags.map((tag) => (
					<span
						key={tag}
						className="inline-flex h-6 items-center rounded-md bg-white/[0.05] px-2 text-xs font-medium text-neutral-300 ring-1 ring-white/10 ring-inset"
					>
						{tag}
					</span>
				))}
			</div>
			<div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
				<div className="flex min-w-0 items-center gap-1 text-xs whitespace-nowrap text-neutral-500">
					{!props.compact && <span className="truncate">{clip.edited} ·</span>}
					<span className="inline-flex items-center gap-1">
						<Copy className="size-3" aria-hidden />
						<span className="tabular-nums">{copies}</span>
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						tabIndex={interactive ? 0 : -1}
						onClick={props.onCopy}
						className={cn(
							"mr-1 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
							props.copied
								? "bg-green-300/15 text-green-300"
								: props.highlight === "copy"
									? "bg-green-300 text-neutral-900 hover:bg-green-200"
									: "bg-white/[0.07] text-neutral-100",
							!interactive && "pointer-events-none"
						)}
					>
						{props.copied ? (
							<Check className="size-3.5" aria-hidden />
						) : (
							<Copy className="size-3.5" aria-hidden />
						)}
						{props.copied ? "Copied" : "Copy"}
					</button>
					<button
						type="button"
						aria-label="Share"
						tabIndex={props.highlight === "share" ? 0 : -1}
						onClick={props.onShare}
						className={cn(
							"inline-flex size-7 items-center justify-center rounded-md transition-colors",
							props.highlight === "share"
								? "bg-green-300 text-neutral-900 hover:bg-green-200"
								: "pointer-events-none text-neutral-400"
						)}
					>
						<Link2 className="size-3.5" aria-hidden />
					</button>
					<span
						aria-hidden
						className="inline-flex size-7 items-center justify-center text-neutral-400"
					>
						<Pencil className="size-3.5" />
					</span>
				</div>
			</div>
		</div>
	);
}
