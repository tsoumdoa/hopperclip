import { createFileRoute, Link } from "@tanstack/react-router";
import { SignUpButton } from "@clerk/tanstack-react-start";
import { ArrowRight } from "lucide-react";
import { LandingShell } from "@/app/components/landing/landing-shell";
import { Reveal } from "@/app/components/landing/reveal";

export const Route = createFileRoute("/_static/lp5")({
	head: () => ({ meta: [{ title: "Hopper Clip — A better way to share Grasshopper" }] }),
	component: Lp5,
});

function Lp5() {
	return (
		<LandingShell>
			<article className="mx-auto flex w-full max-w-2xl flex-col gap-12 py-16 md:py-24">
				<Reveal>
					<header className="flex flex-col gap-6">
						<h1 className="text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
							Grasshopper deserves a better way to be shared.
						</h1>
						<p className="text-lg leading-relaxed text-neutral-300">
							For something so expressive, Grasshopper is weirdly hard to
							show someone. The file only opens in Rhino. The screenshot only
							shows the canvas. The walkthrough only happens on a call.
						</p>
						<p className="text-lg leading-relaxed text-neutral-400">
							Hopper Clip is a small tool that fixes that. Drop a definition,
							get a link. Anyone can open it in a browser and see the graph
							for themselves — every component, every wire, exactly as you
							built it.
						</p>
						<div className="pt-2">
							<SignUpButton mode="modal">
								<button
									type="button"
									className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
								>
									Try it free
									<ArrowRight className="h-4 w-4" />
								</button>
							</SignUpButton>
						</div>
					</header>
				</Reveal>

				<Reveal delay={0.1}>
					<hr className="border-neutral-900" />
				</Reveal>

				<Reveal delay={0.05}>
					<Section
						kicker="The link"
						body="Paste GhXml or drop a .gh file. Hopper Clip gives you back a short URL that opens in any modern browser — no Rhino, no plugins, no sign-up for the person opening it."
					/>
				</Reveal>
				<Reveal delay={0.05}>
					<Section
						kicker="The graph"
						body="What they see isn't a screenshot — it's the actual definition, laid out as an interactive node canvas they can pan, zoom, and inspect. List and JSON views are there for the curious."
					/>
				</Reveal>
				<Reveal delay={0.05}>
					<Section
						kicker="The comparison"
						body="Send two definitions and Hopper Clip will show what changed between them — added, removed, modified, rewired. Useful for review, for handoffs, and for remembering what you actually did last Tuesday."
					/>
				</Reveal>
				<Reveal delay={0.05}>
					<Section
						kicker="The library"
						body="Everything you share stays in one searchable place. Tag it, find it later, send the same link to someone else. The opposite of a downloads folder."
					/>
				</Reveal>

				<Reveal>
					<footer className="flex flex-col gap-3 border-t border-neutral-900 pt-8">
						<p className="text-base text-neutral-400">
							Made for people who actually share Grasshopper work.
						</p>
						<Link
							to="/duckerweb"
							className="inline-flex w-fit items-center gap-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
						>
							Or just play with it first
							<ArrowRight className="h-4 w-4" />
						</Link>
					</footer>
				</Reveal>
			</article>
		</LandingShell>
	);
}

function Section({ kicker, body }: { kicker: string; body: string }) {
	return (
		<section className="grid grid-cols-1 gap-3 md:grid-cols-[8rem_1fr] md:gap-6">
			<div className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-600">
				{kicker}
			</div>
			<p className="text-base leading-relaxed text-neutral-300 md:text-lg">
				{body}
			</p>
		</section>
	);
}
