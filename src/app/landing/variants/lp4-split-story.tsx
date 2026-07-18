import { useState } from "react";
import { GitCompareArrows, Share2 } from "lucide-react";
import { PrimarySignUp, SecondaryDuckerLink, ProductContrast } from "../ctas";

export function Lp4SplitStory() {
	const [balance, setBalance] = useState(50);
	const [hoverSide, setHoverSide] = useState<"clip" | "ducker" | null>(null);

	const clipFlex =
		hoverSide === "clip" ? 1.35 : hoverSide === "ducker" ? 0.75 : 1;
	const duckerFlex =
		hoverSide === "ducker" ? 1.35 : hoverSide === "clip" ? 0.75 : 1;

	return (
		<div className="pb-16">
			<section className="pt-4 text-center">
				<p className="text-5xl font-bold tracking-tight md:text-7xl">
					Hopper Clip
				</p>
				<h1 className="mx-auto mt-4 max-w-2xl text-2xl font-semibold text-neutral-100 md:text-3xl">
					Online pastebin for Grasshopper — with a local-first file inspector.
				</h1>
				<p className="mx-auto mt-4 max-w-xl text-neutral-400">
					Drag the split (or hover a side) to see the difference: Clip saves and
					shares online; DuckerWeb opens .gh files in your browser without
					uploading.
				</p>
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<PrimarySignUp />
					<SecondaryDuckerLink />
				</div>
			</section>

			<section className="mt-12">
				<div className="mb-4 flex items-center gap-3">
					<span className="w-16 text-right text-xs text-neutral-500">
						Online
					</span>
					<input
						type="range"
						min={20}
						max={80}
						value={balance}
						onChange={(e) => setBalance(Number(e.target.value))}
						className="h-1.5 flex-1 cursor-ew-resize appearance-none rounded-full bg-neutral-800 accent-white"
						aria-label="Balance between Hopper Clip and DuckerWeb"
					/>
					<span className="w-16 text-xs text-neutral-500">Local</span>
				</div>

				<div className="flex min-h-[340px] flex-col gap-3 md:flex-row">
					<article
						onMouseEnter={() => setHoverSide("clip")}
						onMouseLeave={() => setHoverSide(null)}
						style={{ flex: clipFlex * (100 - balance) }}
						className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-neutral-600 bg-neutral-950 p-6 transition-[flex] duration-500 ease-out"
					>
						<div
							aria-hidden
							className="pointer-events-none absolute -right-8 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl"
						/>
						<div>
							<p className="mb-1 text-[11px] tracking-[0.16em] text-emerald-400/80 uppercase">
								Main product · online
							</p>
							<div className="mb-4 inline-flex items-center gap-2 text-neutral-200">
								<Share2 className="h-4 w-4" />
								<span className="text-sm font-medium">Hopper Clip</span>
							</div>
							<h2 className="text-xl font-semibold">Pastebin for GH scripts</h2>
							<p className="mt-2 text-sm leading-relaxed text-neutral-400">
								Save definitions to your account, organize with tags, and share
								a link — so scripts live online instead of in file attachments.
							</p>
						</div>
						<ul className="mt-6 space-y-2 text-sm text-neutral-300">
							<li className="flex gap-2">
								<span className="text-neutral-600">01</span>
								Paste or drop → save to your library
							</li>
							<li className="flex gap-2">
								<span className="text-neutral-600">02</span>
								Tag, search, revisit later
							</li>
							<li className="flex gap-2">
								<span className="text-neutral-600">03</span>
								Send a short share URL
							</li>
						</ul>
					</article>

					<article
						onMouseEnter={() => setHoverSide("ducker")}
						onMouseLeave={() => setHoverSide(null)}
						style={{
							flex: duckerFlex * balance,
							backgroundColor: "#1a1916",
							backgroundImage:
								"linear-gradient(rgba(187,184,175,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(187,184,175,0.08) 1px, transparent 1px)",
							backgroundSize: "24px 24px",
						}}
						className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-neutral-600 p-6 transition-[flex] duration-500 ease-out"
					>
						<div>
							<p className="mb-1 text-[11px] tracking-[0.16em] text-sky-400/80 uppercase">
								Companion tool · local-first
							</p>
							<div className="mb-4 inline-flex items-center gap-2 text-neutral-200">
								<GitCompareArrows className="h-4 w-4" />
								<span className="text-sm font-medium">DuckerWeb</span>
							</div>
							<h2 className="text-xl font-semibold">Look inside .gh files</h2>
							<p className="mt-2 text-sm leading-relaxed text-neutral-400">
								Open a file in your browser to see the graph, Diff two versions,
								and inspect expressions — nothing is uploaded unless you choose
								to save a card.
							</p>
						</div>
						<div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium">
							<span className="rounded-md bg-green-500/15 px-2 py-1 text-green-300 ring-1 ring-green-500/30">
								Added
							</span>
							<span className="rounded-md bg-yellow-400/15 px-2 py-1 text-yellow-200 ring-1 ring-yellow-400/30">
								Modified
							</span>
							<span className="rounded-md bg-red-500/15 px-2 py-1 text-red-300 ring-1 ring-red-500/30">
								Removed
							</span>
							<span className="rounded-md bg-neutral-800 px-2 py-1 text-neutral-400 ring-1 ring-neutral-600">
								No upload required
							</span>
						</div>
					</article>
				</div>
			</section>

			<section className="mx-auto mt-14 max-w-4xl">
				<h2 className="mb-4 text-center text-xl font-semibold">
					Same product, different jobs
				</h2>
				<ProductContrast emphasis="equal" />
			</section>
		</div>
	);
}
