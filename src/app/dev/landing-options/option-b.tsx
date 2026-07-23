import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { cases, heroCopy } from "./shared";

export default function OptionEditorialMono() {
	return (
		<div className="min-h-screen bg-black font-sans text-white">
			<div className="mx-auto flex min-h-screen max-w-400 flex-col px-4 min-[2200px]:px-16 md:px-8 md:pt-6">
				<Header />
				<main className="flex flex-1 flex-col">
					{/* Hero */}
					<section className="flex flex-col gap-10 border-t border-white/10 py-16 md:py-28">
						<Reveal>
							<div className="flex items-center gap-4 font-mono text-xs tracking-[0.25em] text-neutral-500 uppercase">
								<span>[ 01 ]</span>
								<span className="h-px flex-1 bg-white/10" />
								<span>{heroCopy.eyebrow}</span>
							</div>
						</Reveal>
						<Reveal delay={0.06}>
							<h1 className="text-[15vw max-w-5xl leading-[0.92] font-bold tracking-[-0.04em] sm:text-[12vw] md:text-[9rem] md:leading-[0.9]">
								{heroCopy.headline.split(",")[0]},
								<br />
								<span className="text-neutral-500">
									{heroCopy.headline.split(",")[1]?.trim()}.
								</span>
							</h1>
						</Reveal>
						<Reveal delay={0.12}>
							<div className="grid grid-cols-1 gap-8 border-t border-white/10 pt-8 md:grid-cols-[1.5fr_1fr] md:gap-12">
								<p className="max-w-xl text-lg text-neutral-400 md:text-2xl">
									{heroCopy.sub}
								</p>
								<div className="flex flex-col items-start gap-6">
									<SignUpButton mode="modal">
										<button
											type="button"
											className="group inline-flex items-center gap-3 bg-white px-8 py-4 text-sm font-semibold tracking-wider text-black uppercase transition-colors hover:bg-neutral-300"
										>
											{heroCopy.cta}
											<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
										</button>
									</SignUpButton>
									<p className="max-w-xs text-sm text-neutral-600">
										{heroCopy.trust}
									</p>
								</div>
							</div>
						</Reveal>
					</section>

					{/* Use cases */}
					<section className="border-t border-white/10 py-16 md:py-28">
						<Reveal>
							<div className="mb-12 flex items-center gap-4 font-mono text-xs tracking-[0.25em] text-neutral-500 uppercase">
								<span>[ 02 ]</span>
								<span className="h-px flex-1 bg-white/10" />
								<span>use cases</span>
							</div>
						</Reveal>
						<div className="divide-y divide-white/10 border-y border-white/10">
							{cases.map((c, i) => (
								<Reveal key={c.eyebrow} delay={i * 0.06}>
									<Row {...c} index={i} />
								</Reveal>
							))}
						</div>
					</section>

					{/* Closing */}
					<section className="border-t border-white/10 py-16 md:py-28">
						<Reveal>
							<div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
								<h2 className="max-w-3xl text-4xl font-bold tracking-[-0.03em] md:text-6xl">
									Stop sending files.
									<br />
									<span className="text-neutral-600">Start sending links.</span>
								</h2>
								<Link
									to="/duckerweb"
									className="group inline-flex items-center gap-3 border border-white/20 px-8 py-4 font-mono text-xs font-semibold tracking-[0.2em] text-white uppercase transition-colors hover:bg-white hover:text-black"
								>
									Try DuckerWeb
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
		<div className="group grid grid-cols-1 items-start gap-6 py-10 transition-colors hover:bg-white/[0.02] md:grid-cols-[4rem_1fr_2fr] md:gap-10 md:px-2">
			<div className="font-mono text-sm text-neutral-600">0{index + 1}</div>
			<div className="flex items-center gap-4">
				<Icon className="h-5 w-5 text-white" />
				<span className="font-mono text-xs tracking-[0.2em] text-neutral-500 uppercase">
					{eyebrow}
				</span>
			</div>
			<div className="flex flex-col gap-3">
				<h3 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
					{title}
				</h3>
				<p className="max-w-xl text-neutral-400">{body}</p>
			</div>
		</div>
	);
}
