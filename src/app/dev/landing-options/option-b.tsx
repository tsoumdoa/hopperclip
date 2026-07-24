import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, GitCompareArrows, Plug } from "lucide-react";
import { motion } from "motion/react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { BrowserFrame, DiffLegend, GhCanvas } from "./ghmock";
import { cases, heroCopy } from "./shared";

/**
 * Option — "Diff": dark, split hero that leads with the version-diff view.
 * The product (glowing added/removed/modified nodes) sits opposite the copy,
 * making the killer differentiator the first thing you see.
 */
export default function OptionDiff() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[oklch(0.13_0.005_270)] font-sans text-white">
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="bg-grid mask-radial-fade absolute inset-0 opacity-50" />
				<motion.div className="absolute top-[6%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_150/0.14),transparent_64%)] blur-2xl" />
				<div className="absolute top-[20%] left-[-12%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.18),transparent_64%)] blur-2xl" />
			</div>

			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6 md:pb-2 2xl:px-10">
				<Header />
				<main className="relative flex flex-1 flex-col gap-24 py-14 md:py-20">
					{/* Split hero */}
					<section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
						<div className="flex flex-col items-start gap-6">
							<Reveal>
								<span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
									<GitCompareArrows className="h-3.5 w-3.5 text-emerald-300" />
									duckerweb · visualize &amp; diff
								</span>
							</Reveal>
							<Reveal delay={0.06}>
								<h1 className="text-5xl leading-[1.03] font-semibold tracking-tight text-balance md:text-6xl">
									See what{" "}
									<span className="bg-gradient-to-br from-emerald-300 via-amber-200 to-rose-300 bg-clip-text text-transparent">
										changed
									</span>
									, not what's there.
								</h1>
							</Reveal>
							<Reveal delay={0.12}>
								<p className="max-w-xl text-lg text-neutral-400 md:text-xl">
									DuckerWeb is our free, browser-only viewer. Drop in two
									versions of a definition and it highlights every added,
									removed, modified, and rewired component — wire by wire. The
									visual companion to your Hopper Clip snippet library.
								</p>
							</Reveal>
							<Reveal delay={0.18}>
								<div className="flex flex-col items-start gap-4">
									<SignUpButton mode="modal">
										<button
											type="button"
											className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-[0_0_40px_-8px_oklch(0.72_0.2_150/0.6)] transition-all hover:bg-neutral-200 md:text-base"
										>
											{heroCopy.cta}
											<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
										</button>
									</SignUpButton>
									<div className="flex items-center gap-2 text-sm text-neutral-400">
										<Plug className="h-4 w-4 shrink-0 text-neutral-500" />
										{heroCopy.trust}
									</div>
								</div>
							</Reveal>
						</div>

						<Reveal delay={0.12}>
							<div className="relative">
								<div className="pointer-events-none absolute -inset-x-6 -top-6 bottom-0 -z-10 bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.2_150/0.2),transparent_70%)] blur-2xl" />
								<BrowserFrame
									url="hopperclip.com/duckerweb"
									tabs={[{ label: "Flow" }, { label: "Diff", active: true }]}
								>
									<GhCanvas variant="diff" />
								</BrowserFrame>
								<div className="mt-4 flex items-center justify-between gap-3">
									<span className="font-mono text-xs text-neutral-500">
										v3 → v4
									</span>
									<DiffLegend />
								</div>
							</div>
						</Reveal>
					</section>

					{/* Use cases */}
					<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{cases.map((c, i) => (
							<Reveal key={c.eyebrow} delay={i * 0.08}>
								<CaseCard {...c} />
							</Reveal>
						))}
					</section>

					{/* Closing */}
					<section>
						<Reveal>
							<div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-10 text-center md:p-14">
								<div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_150/0.22),transparent_70%)] blur-2xl" />
								<h2 className="relative max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
									Review a change, not the whole graph.
								</h2>
								<Link
									to="/duckerweb"
									className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
								>
									Try a diff in DuckerWeb
									<ArrowRight className="h-4 w-4" />
								</Link>
							</div>
						</Reveal>
					</section>
				</main>
				<Footer />
			</div>
		</div>
	);
}

function CaseCard({
	icon: Icon,
	eyebrow,
	title,
	body,
}: {
	icon: React.ComponentType<{ className?: string }>;
	eyebrow: string;
	title: string;
	body: string;
}) {
	return (
		<div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 backdrop-blur-sm transition-all hover:border-white/15 hover:bg-white/[0.04]">
			<div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-emerald-300">
				<Icon className="h-5 w-5" />
			</div>
			<div className="font-mono text-xs tracking-[0.18em] text-neutral-500 uppercase">
				{eyebrow}
			</div>
			<h3 className="text-xl leading-snug font-semibold tracking-tight">
				{title}
			</h3>
			<p className="text-sm leading-relaxed text-neutral-400">{body}</p>
		</div>
	);
}
