import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plug, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { cases, heroCopy } from "./shared";

export default function OptionAuroraGlass() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[oklch(0.13_0.005_270)] font-sans text-white">
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="bg-grid mask-radial-fade absolute inset-0 opacity-70" />
				<motion.div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.3),transparent_62%)] blur-2xl" />
				<div className="absolute top-[18%] -left-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.7_0.16_220/0.16),transparent_62%)] blur-2xl" />
				<div className="absolute top-[10%] -right-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.68_0.2_330/0.14),transparent_62%)] blur-2xl" />
			</div>
			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6 md:pb-2 2xl:px-10">
				<Header />
				<main className="relative flex flex-1 flex-col items-center gap-20 py-16 md:py-24">
					<section className="flex flex-col items-center gap-8 text-center">
						<Reveal>
							<Eyebrow>{heroCopy.eyebrow}</Eyebrow>
						</Reveal>
						<Reveal delay={0.06}>
							<h1 className="max-w-4xl text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-7xl">
								<span className="text-gradient">
									{heroCopy.headline.split(",")[0]},
								</span>{" "}
								<span className="bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
									{heroCopy.headline.split(",")[1]?.trim()}.
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
						<Reveal delay={0.24}>
							<Preview />
						</Reveal>
					</section>

					<section className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
						{cases.map((c, i) => (
							<Reveal key={c.eyebrow} delay={i * 0.08}>
								<Card {...c} />
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
										<Sparkles className="h-4 w-4 text-fuchsia-300" />
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

function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
			<span className="relative flex h-1.5 w-1.5">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
				<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
			</span>
			{children}
		</div>
	);
}

function Preview() {
	return (
		<div className="relative mt-4 w-full max-w-5xl">
			<div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.62_0.19_277/0.22),transparent_70%)] blur-xl" />
			<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-sm">
				<div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
					<span className="h-3 w-3 rounded-full bg-red-400/70" />
					<span className="h-3 w-3 rounded-full bg-yellow-400/70" />
					<span className="h-3 w-3 rounded-full bg-green-400/70" />
					<span className="ml-3 font-mono text-xs text-neutral-500">
						hopperclip.com/ghcards/panel-facade
					</span>
				</div>
				<div className="bg-grid relative aspect-[16/9] w-full">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0.13_0.005_270)_85%)]" />
				</div>
			</div>
		</div>
	);
}

function Card({
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
