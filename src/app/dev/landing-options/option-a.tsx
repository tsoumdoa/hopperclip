import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plug } from "lucide-react";
import { motion } from "motion/react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { BrowserFrame, GhCanvas } from "./ghmock";
import { cases, heroCopy } from "./shared";

/**
 * Option — "Canvas": dark, product-first. The real Grasshopper canvas floats
 * in a browser frame as the centerpiece, tabs mirroring the graph/list/JSON views.
 */
export default function OptionCanvas() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[oklch(0.13_0.005_270)] font-sans text-white">
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="bg-grid mask-radial-fade absolute inset-0 opacity-60" />
				<motion.div className="absolute -top-48 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.26),transparent_64%)] blur-2xl" />
			</div>

			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6 md:pb-2 2xl:px-10">
				<Header />
				<main className="relative flex flex-1 flex-col items-center gap-20 py-14 md:py-20">
					<section className="flex flex-col items-center gap-7 text-center">
						<Reveal>
							<span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
								<span className="relative flex h-1.5 w-1.5">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
									<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
								</span>
								{heroCopy.eyebrow}
							</span>
						</Reveal>
						<Reveal delay={0.06}>
							<h1 className="max-w-4xl text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-7xl">
								<span className="text-gradient">Grasshopper,</span>{" "}
								<span className="bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
									sorted.
								</span>
							</h1>
						</Reveal>
						<Reveal delay={0.12}>
							<p className="mx-auto max-w-2xl text-lg text-balance text-neutral-400 md:text-xl">
								{heroCopy.sub}
							</p>
						</Reveal>
						<Reveal delay={0.18}>
							<div className="flex flex-col items-center gap-4">
								<SignUpButton mode="modal">
									<button
										type="button"
										className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-[0_0_40px_-8px_oklch(0.62_0.19_277/0.6)] transition-all hover:bg-neutral-200 md:text-base"
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
					</section>

					<Reveal delay={0.1} className="w-full max-w-5xl">
						<div className="relative">
							<div className="pointer-events-none absolute -inset-x-8 -top-8 bottom-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.62_0.19_277/0.28),transparent_70%)] blur-2xl" />
							<BrowserFrame
								tabs={[
									{ label: "Flow", active: true },
									{ label: "List" },
									{ label: "JSON" },
								]}
							>
								<GhCanvas />
							</BrowserFrame>
						</div>
					</Reveal>

					<section className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
						{cases.map((c, i) => (
							<Reveal key={c.eyebrow} delay={i * 0.08}>
								<CaseCard {...c} />
							</Reveal>
						))}
					</section>

					<section className="w-full max-w-5xl">
						<Reveal>
							<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 text-center md:p-12">
								<div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.28),transparent_70%)] blur-2xl" />
								<div className="relative flex flex-col items-center gap-5">
									<h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
										Stop sending .gh files. Start sending links.
									</h2>
									<Link
										to="/duckerweb"
										className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
									>
										Try DuckerWeb free
										<ArrowRight className="h-4 w-4" />
									</Link>
								</div>
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
			<div className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.18),transparent_70%)] opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
			<div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-indigo-300">
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
