import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plug, Sparkles, Zap } from "lucide-react";
import { motion } from "motion/react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { cases, heroCopy } from "./shared";

export default function OptionBoldGradient() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[oklch(0.14_0.02_300)] font-sans text-white">
			<AnimatedMesh />
			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6">
				<Header />
				<main className="relative flex flex-1 flex-col items-center gap-24 py-16 md:py-24">
					{/* Hero */}
					<section className="flex flex-col items-center gap-8 text-center">
						<Reveal>
							<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide text-white backdrop-blur">
								<Zap className="h-3.5 w-3.5 text-yellow-300" />
								{heroCopy.eyebrow}
							</span>
						</Reveal>
						<Reveal delay={0.06}>
							<h1 className="max-w-5xl text-6xl leading-[0.95] font-black tracking-[-0.04em] text-balance drop-shadow-[0_2px_30px_rgba(0,0,0,0.4)] md:text-8xl">
								<span className="bg-gradient-to-r from-yellow-200 via-pink-300 to-violet-300 bg-clip-text text-transparent">
									{heroCopy.headline.split(",")[0]},
								</span>
								<br />
								{heroCopy.headline.split(",")[1]?.trim()}.
							</h1>
						</Reveal>
						<Reveal delay={0.12}>
							<p className="mx-auto max-w-2xl text-lg text-balance text-white/80 md:text-xl">
								{heroCopy.sub}
							</p>
						</Reveal>
						<Reveal delay={0.18}>
							<div className="flex flex-col items-center gap-3">
								<SignUpButton mode="modal">
									<button
										type="button"
										className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-extrabold text-[oklch(0.3_0.18_300)] shadow-[0_8px_40px_-6px_rgba(255,255,255,0.5)] transition-all hover:scale-[1.03]"
									>
										{heroCopy.cta}
										<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
									</button>
								</SignUpButton>
								<div className="flex items-center gap-2 text-sm text-white/70">
									<Plug className="h-4 w-4 shrink-0" />
									{heroCopy.trust}
								</div>
							</div>
						</Reveal>
					</section>

					{/* Use cases */}
					<section className="grid w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
						{cases.map((c, i) => (
							<Reveal key={c.eyebrow} delay={i * 0.08}>
								<Card {...c} index={i} />
							</Reveal>
						))}
					</section>

					{/* Closing */}
					<section className="w-full max-w-5xl">
						<Reveal>
							<div className="flex flex-col items-center gap-6 rounded-[2rem] border border-white/20 bg-white/10 p-10 text-center backdrop-blur-md md:p-16">
								<h2 className="max-w-2xl text-4xl font-black tracking-[-0.03em] text-balance md:text-5xl">
									Stop sending .gh files.
									<br />
									<span className="bg-gradient-to-r from-yellow-200 to-pink-300 bg-clip-text text-transparent">
										Start sending links.
									</span>
								</h2>
								<Link
									to="/duckerweb"
									className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/25"
								>
									<Sparkles className="h-4 w-4 text-yellow-300" />
									Try DuckerWeb free
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

function AnimatedMesh() {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
			<motion.div
				animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
				transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
				className="absolute -top-40 -left-20 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.7_0.25_20/0.55),transparent_60%)] blur-3xl"
			/>
			<motion.div
				animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
				transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-10 -right-20 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.65_0.28_300/0.5),transparent_60%)] blur-3xl"
			/>
			<motion.div
				animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
				transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-[30%] left-1/3 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.7_0.22_200/0.4),transparent_60%)] blur-3xl"
			/>
		</div>
	);
}

function Card({
	icon: Icon,
	eyebrow,
	title,
	body,
	index,
}: {
	icon: React.ComponentType<{ className?: string }>;
	eyebrow: string;
	title: string;
	body: string;
	index: number;
}) {
	const tints = [
		"from-pink-400/30 to-rose-400/10",
		"from-violet-400/30 to-indigo-400/10",
		"from-sky-400/30 to-cyan-400/10",
	];
	return (
		<div className="group relative h-full overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-md transition-all hover:scale-[1.02] hover:border-white/30">
			<div
				className={`pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-gradient-to-br ${tints[index % tints.length]} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
			/>
			<div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
				<Icon className="h-6 w-6" />
			</div>
			<div className="font-mono text-[11px] tracking-[0.2em] text-white/70 uppercase">
				{eyebrow}
			</div>
			<h3 className="mt-2 text-2xl font-extrabold tracking-[-0.02em]">
				{title}
			</h3>
			<p className="mt-3 text-sm leading-relaxed text-white/75">{body}</p>
		</div>
	);
}
