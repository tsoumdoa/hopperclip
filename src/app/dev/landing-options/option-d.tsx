import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { GhCanvas } from "./ghmock";
import { cases, heroCopy } from "./shared";

/**
 * Option — "Brutalist": raw and structural. Monospace throughout, hard 2px
 * black borders, no rounding, no gradients, no shadows. The page reads like a
 * spec sheet, with the real canvas dropped in as a labelled figure.
 */
export default function OptionBrutalist() {
	return (
		<div className="min-h-screen bg-[#e9e7df] font-mono text-black">
			<div className="mx-auto flex min-h-screen max-w-400 flex-col border-black md:border-x-2 md:px-0">
				<div className="border-b-2 border-black px-4 py-3 md:px-6 [&_a]:text-black [&_button]:rounded-none [&_button]:text-black">
					<Header />
				</div>

				{/* Meta strip */}
				<div className="grid grid-cols-2 border-b-2 border-black text-[11px] tracking-[0.15em] uppercase md:grid-cols-4">
					<Meta label="Product" value="Hopper Clip" />
					<Meta label="Domain" value="Grasshopper" />
					<Meta label="Install" value="None" />
					<Meta label="License" value="MIT / OSS" />
				</div>

				<main className="flex flex-1 flex-col">
					{/* Hero */}
					<section className="grid grid-cols-1 lg:grid-cols-2">
						<div className="flex flex-col justify-between gap-8 border-b-2 border-black px-4 py-10 md:px-6 md:py-14 lg:border-r-2 lg:border-b-0">
							<Reveal>
								<p className="text-[11px] tracking-[0.25em] uppercase">
									[00] — {heroCopy.eyebrow}
								</p>
							</Reveal>
							<Reveal delay={0.06}>
								<h1 className="text-5xl leading-[0.92] font-bold tracking-[-0.03em] uppercase md:text-7xl">
									Grasshopper,
									<br />
									Sorted.
								</h1>
							</Reveal>
							<Reveal delay={0.12}>
								<div className="flex flex-col gap-7">
									<p className="max-w-md text-sm leading-relaxed text-neutral-800 md:text-base">
										{heroCopy.sub}
									</p>
									<div className="flex flex-col items-start gap-3">
										<SignUpButton mode="modal">
											<button
												type="button"
												className="group inline-flex items-center gap-3 border-2 border-black bg-black px-7 py-4 text-xs font-bold tracking-[0.15em] text-[#e9e7df] uppercase transition-colors hover:bg-[#e9e7df] hover:text-black"
											>
												{heroCopy.cta}
												<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
											</button>
										</SignUpButton>
										<p className="max-w-xs text-[11px] leading-relaxed tracking-wide text-neutral-600 uppercase">
											{heroCopy.trust}
										</p>
									</div>
								</div>
							</Reveal>
						</div>

						{/* Figure */}
						<div className="flex flex-col">
							<div className="flex items-center justify-between border-b-2 border-black px-4 py-2 text-[11px] tracking-[0.2em] uppercase md:px-6">
								<span>Fig.01 — Definition canvas</span>
								<span>Flow / List / JSON</span>
							</div>
							<Reveal delay={0.12} className="flex-1">
								<div className="h-full bg-[#ebe9e4] p-3 md:p-4">
									<div className="border-2 border-black">
										<GhCanvas />
									</div>
								</div>
							</Reveal>
						</div>
					</section>

					{/* Use cases */}
					<section className="border-t-2 border-black">
						<div className="border-b-2 border-black px-4 py-2 text-[11px] tracking-[0.25em] uppercase md:px-6">
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
					<section className="border-t-2 border-black">
						<div className="flex flex-col gap-8 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-20">
							<Reveal>
								<h2 className="max-w-2xl text-4xl leading-[0.95] font-bold tracking-[-0.03em] uppercase md:text-6xl">
									Stop sending
									<br />
									.gh files.
								</h2>
							</Reveal>
							<Reveal delay={0.08}>
								<Link
									to="/duckerweb"
									className="group inline-flex items-center gap-3 border-2 border-black px-7 py-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors hover:bg-black hover:text-[#e9e7df]"
								>
									Open DuckerWeb
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Reveal>
						</div>
					</section>
				</main>

				<div className="border-t-2 border-black px-4 py-3 md:px-6 [&_a]:text-neutral-700">
					<Footer />
				</div>
			</div>
		</div>
	);
}

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<div className="border-black px-4 py-2.5 not-last:border-r-2 md:px-6">
			<div className="text-[10px] text-neutral-500">{label}</div>
			<div className="font-bold">{value}</div>
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
			className={`group flex h-full flex-col gap-5 border-b-2 border-black px-4 py-8 transition-colors hover:bg-black hover:text-[#e9e7df] md:px-6 md:py-10 ${last ? "" : "md:border-r-2 md:border-b-2"}`}
		>
			<div className="flex items-center justify-between">
				<span className="text-4xl font-bold tabular-nums">
					0{index + 1}
				</span>
				<Icon className="h-6 w-6" />
			</div>
			<div className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase group-hover:text-neutral-400">
				{eyebrow}
			</div>
			<h3 className="text-xl leading-tight font-bold tracking-tight uppercase">
				{title}
			</h3>
			<p className="text-sm leading-relaxed text-neutral-700 group-hover:text-neutral-300">
				{body}
			</p>
		</div>
	);
}
