import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Share } from "lucide-react";
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
 * Not a full tour — one click, one confirmation.
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

					return (
						<li
							key={clip.id}
							className={`rounded-lg border bg-neutral-950 px-4 py-3 transition-colors ${
								featured
									? "border-neutral-600"
									: "border-neutral-900 opacity-70"
							}`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium text-white">
										{clip.name}
									</p>
									<p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
										{clip.description}
									</p>
									<div className="mt-2 flex flex-wrap gap-1.5">
										{clip.tags.map((tag) => (
											<span
												key={tag}
												className="font-mono text-[10px] tracking-wide text-neutral-600 uppercase"
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
										className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
											justCopied
												? "bg-white text-black"
												: "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
										}`}
									>
										{justCopied ? (
											<>
												<Check className="h-3.5 w-3.5" />
												copied
											</>
										) : (
											<>
												<Copy className="h-3.5 w-3.5" />
												copy
											</>
										)}
									</button>
								)}
								{featured && mode === "share" && (
									<button
										type="button"
										onClick={() => handleShare(clip.id)}
										className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
											justShared
												? "bg-white text-black"
												: "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
										}`}
									>
										{justShared ? (
											<>
												<Check className="h-3.5 w-3.5" />
												shared
											</>
										) : (
											<>
												<Share className="h-3.5 w-3.5" />
												share
											</>
										)}
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
						<div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300">
							hopperclip.com/share?…
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
