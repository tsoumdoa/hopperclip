import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { GhCanvas } from "./ghmock";
import { cases, heroCopy } from "./shared";

/**
 * Option — "Dark Sans": the Mono Dark layout, but typeset in the site's normal
 * sans font (Geist). Only the small structural labels stay monospace as accents.
 */
export default function OptionDarkSans() {
	return (
		<div className="min-h-screen bg-[#0a0a0a] font-sans text-neutral-200">
			<div className="mx-auto flex min-h-screen max-w-400 flex-col border-white/10 md:border-x">
				<div className="border-b border-white/10 px-4 py-3 md:px-6">
					<Header />
				</div>

				<main className="flex flex-1 flex-col">
					{/* Hero */}
					<section className="grid grid-cols-1 lg:grid-cols-2">
						<div className="flex flex-col justify-between gap-10 border-b border-white/10 px-4 py-12 md:px-6 md:py-16 lg:border-r lg:border-b-0">
							<Reveal>
								<p className="font-mono text-[11px] tracking-[0.25em] text-neutral-500 uppercase">
									[00] — {heroCopy.eyebrow}
								</p>
							</Reveal>
							<Reveal delay={0.06}>
								<h1 className="text-5xl leading-[0.98] font-semibold tracking-[-0.03em] text-white md:text-7xl">
									Grasshopper,
									<br />
									<span className="text-neutral-600">sorted.</span>
								</h1>
							</Reveal>
							<Reveal delay={0.12}>
								<div className="flex flex-col gap-7">
									<p className="max-w-md text-base leading-relaxed text-neutral-400">
										{heroCopy.sub}
									</p>
									<div className="flex flex-col items-start gap-3">
										<SignUpButton mode="modal">
											<button
												type="button"
												className="group inline-flex items-center gap-2 border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
											>
												{heroCopy.cta}
												<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
											</button>
										</SignUpButton>
										<p className="max-w-xs text-xs leading-relaxed text-neutral-600">
											{heroCopy.trust}
										</p>
									</div>
								</div>
							</Reveal>
						</div>

						{/* Figure */}
						<div className="flex flex-col">
							<div className="flex items-center justify-between border-b border-white/10 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase md:px-6">
								<span>Fig.01 — Definition canvas</span>
								<span>Flow / List / JSON</span>
							</div>
							<Reveal delay={0.12} className="flex-1">
								<div className="h-full p-3 md:p-4">
									<div className="border border-white/10">
										<GhCanvas monochrome />
									</div>
								</div>
							</Reveal>
						</div>
					</section>

					{/* Use cases */}
					<section className="border-t border-white/10">
						<div className="border-b border-white/10 px-4 py-2 font-mono text-[11px] tracking-[0.25em] text-neutral-500 uppercase md:px-6">
							[01] — Use cases
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3">
							{cases.map((c, i) => (
								<Reveal key={c.eyebrow} delay={i * 0.06}>
									<Cell {...c} index={i} last={i === cases.length - 1} />
								</Reveal>
							))}
						</div>
					</section>

					{/* Closing */}
					<section className="border-t border-white/10">
						<div className="flex flex-col gap-8 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-20">
							<Reveal>
								<h2 className="max-w-2xl text-4xl leading-[1.02] font-semibold tracking-[-0.03em] text-white md:text-6xl">
									Stop sending
									<br />
									<span className="text-neutral-600">.gh files.</span>
								</h2>
							</Reveal>
							<Reveal delay={0.08}>
								<Link
									to="/duckerweb"
									className="group inline-flex items-center gap-2 border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
								>
									Open DuckerWeb
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Reveal>
						</div>
					</section>
				</main>

				<div className="border-t border-white/10 px-4 py-3 md:px-6">
					<Footer />
				</div>
			</div>
		</div>
	);
}

function Cell({
	icon: Icon,
	eyebrow,
	title,
	body,
	index,
	last,
}: {
	icon: React.ComponentType<{ className?: string }>;
	eyebrow: string;
	title: string;
	body: string;
	index: number;
	last: boolean;
}) {
	return (
		<div
			className={`group flex h-full flex-col gap-5 border-b border-white/10 px-4 py-8 transition-colors hover:bg-white/[0.02] md:px-6 md:py-10 ${last ? "" : "md:border-r"}`}
		>
			<div className="flex items-center justify-between">
				<span className="font-mono text-4xl font-bold text-white tabular-nums">
					0{index + 1}
				</span>
				<Icon className="h-6 w-6 text-neutral-400" />
			</div>
			<div className="font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase">
				{eyebrow}
			</div>
			<h3 className="text-xl leading-tight font-semibold tracking-tight text-white">
				{title}
			</h3>
			<p className="text-sm leading-relaxed text-neutral-400">{body}</p>
		</div>
	);
}
