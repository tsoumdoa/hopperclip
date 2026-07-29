import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const SAMPLE_CLIPS = [
	{
		id: "facade",
		name: "ParametricFacade",
		description: "Panel divisions with custom depth offsets",
		tags: ["architecture", "facade"],
	},
	{
		id: "curve",
		name: "DisplayCurveLength",
		description: "Curve length labels with unit formatting",
		tags: ["analysis"],
	},
	{
		id: "voronoi",
		name: "VoronoiPattern",
		description: "Surface subdivision with attractor points",
		tags: ["geometry"],
	},
] as const;

type DemoMode = "preview" | "copy" | "share";

/**
 * Tiny in-page product mock: preview, or copy/share one sample clip.
 * Uses Hopper Card accents (green-300 Shared, tag chips) — not a full tour.
 */
export function ClipLibraryDemo({
	mode = "preview",
	featuredId = "facade",
}: {
	mode?: DemoMode;
	featuredId?: (typeof SAMPLE_CLIPS)[number]["id"];
}) {
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [sharedId, setSharedId] = useState<string | null>(null);

	const handleCopy = (id: string) => {
		setSharedId(null);
		setCopiedId(id);
		window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
	};

	const handleShare = (id: string) => {
		setCopiedId(null);
		setSharedId(id);
		window.setTimeout(() => setSharedId((cur) => (cur === id ? null : cur)), 2800);
	};

	return (
		<div className="relative">
			<ul className="flex flex-col gap-2.5">
				{SAMPLE_CLIPS.map((clip) => {
					const featured = clip.id === featuredId;
					const justCopied = copiedId === clip.id;
					const justShared = sharedId === clip.id;
					const showSharedBadge =
						(mode === "preview" && clip.id === "facade") || justShared;

					return (
						<li
							key={clip.id}
							className={`relative rounded-md p-3 ring-1 transition-colors ${
								featured
									? "bg-neutral-900 ring-neutral-500"
									: "bg-neutral-950 ring-neutral-800 opacity-70"
							}`}
						>
							{showSharedBadge && (
								<span className="absolute top-2.5 right-2.5 rounded-md bg-green-300 px-2 text-xs font-bold text-neutral-800">
									Shared
								</span>
							)}
							<div className="flex items-start justify-between gap-3">
								<div
									className={`min-w-0 ${showSharedBadge ? "pr-16" : ""}`}
								>
									<p className="truncate text-sm font-semibold text-white">
										{clip.name}
									</p>
									<p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">
										{clip.description}
									</p>
									<div className="mt-2 flex flex-wrap gap-1.5">
										{clip.tags.map((tag) => (
											<span
												key={tag}
												className="rounded-sm bg-neutral-600 px-2 text-xs font-semibold text-neutral-100"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
								{featured && mode === "copy" && (
									<button
										type="button"
										onClick={() => handleCopy(clip.id)}
										className={`shrink-0 px-2 text-sm font-bold transition-colors ${
											justCopied
												? "rounded-md bg-green-300 text-neutral-800"
												: "text-neutral-400 hover:text-neutral-50"
										}`}
									>
										{justCopied ? "copied!" : "copy"}
									</button>
								)}
								{featured && mode === "share" && !justShared && (
									<button
										type="button"
										onClick={() => handleShare(clip.id)}
										className="shrink-0 px-2 text-sm font-bold text-neutral-400 transition-colors hover:text-neutral-50"
									>
										share
									</button>
								)}
							</div>
						</li>
					);
				})}
			</ul>

			<AnimatePresence>
				{sharedId && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
						className="absolute inset-x-0 -bottom-14 flex justify-center"
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
