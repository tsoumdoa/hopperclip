import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { GhCanvas } from "./ghmock";
import { cases, heroCopy } from "./shared";

/**
 * Option — "Studio": light, editorial. The whole page adopts Grasshopper's
 * native paper-canvas aesthetic — warm neutrals, hairline rules, mono labels —
 * with the real canvas embedded as a framed plate rather than a screenshot.
 */
export default function OptionStudio() {
	return (
		<div className="min-h-screen bg-[#f4f2ed] font-sans text-[#1c1b19]">
			<div className="mx-auto flex min-h-screen max-w-400 flex-col px-4 min-[2200px]:px-16 md:px-8 md:pt-6">
				<div className="[&_a]:text-[#1c1b19] [&_button]:text-[#1c1b19]">
					<Header />
				</div>
				<main className="flex flex-1 flex-col">
					{/* Hero */}
					<section className="grid grid-cols-1 gap-10 border-t border-[#1c1b19]/12 py-14 md:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
						<div className="flex flex-col gap-7">
							<Reveal>
								<div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-[#6a675f] uppercase">
									<span>{heroCopy.eyebrow}</span>
									<span className="h-px flex-1 bg-[#1c1b19]/12" />
								</div>
							</Reveal>
							<Reveal delay={0.06}>
								<h1 className="text-5xl leading-[0.98] font-semibold tracking-[-0.03em] text-balance md:text-7xl">
									Grasshopper,
									<br />
									<span className="text-[#8a8681]">sorted.</span>
								</h1>
							</Reveal>
							<Reveal delay={0.12}>
								<p className="max-w-xl text-lg text-[#55524b] md:text-xl">
									{heroCopy.sub}
								</p>
							</Reveal>
							<Reveal delay={0.18}>
								<div className="flex flex-col items-start gap-4">
									<SignUpButton mode="modal">
										<button
											type="button"
											className="group inline-flex items-center gap-2 rounded-full bg-[#1c1b19] px-7 py-3.5 text-sm font-semibold text-[#f4f2ed] transition-colors hover:bg-[#33312d] md:text-base"
										>
											{heroCopy.cta}
											<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
										</button>
									</SignUpButton>
									<p className="max-w-sm text-sm text-[#78756d]">
										{heroCopy.trust}
									</p>
								</div>
							</Reveal>
						</div>

						<Reveal delay={0.12}>
							<figure className="rounded-xl border border-[#1c1b19]/15 bg-[#ebe9e4] p-2 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.4)]">
								<GhCanvas className="rounded-md" />
								<figcaption className="flex items-center justify-between px-2 pt-2.5 pb-1 font-mono text-[11px] text-[#6a675f]">
									<span>panel-facade.gh</span>
									<span>flow · list · json</span>
								</figcaption>
							</figure>
						</Reveal>
					</section>

					{/* Use cases */}
					<section className="border-t border-[#1c1b19]/12 py-14 md:py-20">
						<Reveal>
							<div className="mb-10 flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-[#6a675f] uppercase">
								<span>use cases</span>
								<span className="h-px flex-1 bg-[#1c1b19]/12" />
							</div>
						</Reveal>
						<div className="divide-y divide-[#1c1b19]/12 border-y border-[#1c1b19]/12">
							{cases.map((c, i) => (
								<Reveal key={c.eyebrow} delay={i * 0.06}>
									<Row {...c} index={i} />
								</Reveal>
							))}
						</div>
					</section>

					{/* Closing */}
					<section className="border-t border-[#1c1b19]/12 py-16 md:py-24">
						<Reveal>
							<div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
								<h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
									Stop sending .gh files.
									<br />
									<span className="text-[#8a8681]">Start sending links.</span>
								</h2>
								<Link
									to="/duckerweb"
									className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[#1c1b19]/25 px-6 py-3 text-sm font-semibold text-[#1c1b19] transition-colors hover:bg-[#1c1b19] hover:text-[#f4f2ed]"
								>
									Try DuckerWeb free
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
								</Link>
							</div>
						</Reveal>
					</section>
				</main>
				<div className="[&_a]:text-[#55524b]">
					<Footer />
				</div>
			</div>
		</div>
	);
}

function Row({
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
	return (
		<div className="group grid grid-cols-1 items-start gap-5 py-9 transition-colors hover:bg-[#1c1b19]/[0.02] md:grid-cols-[3rem_1fr_2fr] md:gap-10 md:px-2">
			<div className="font-mono text-sm text-[#a29e95]">
				0{index + 1}
			</div>
			<div className="flex items-center gap-3">
				<Icon className="h-5 w-5 text-[#1c1b19]" />
				<span className="font-mono text-[11px] tracking-[0.2em] text-[#6a675f] uppercase">
					{eyebrow}
				</span>
			</div>
			<div className="flex flex-col gap-2.5">
				<h3 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
					{title}
				</h3>
				<p className="max-w-xl text-[#55524b]">{body}</p>
			</div>
		</div>
	);
}
