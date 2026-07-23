import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Crosshair, MoveDiagonal } from "lucide-react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { cases, heroCopy } from "./shared";

export default function OptionBlueprint() {
	return (
		<div
			className="relative min-h-screen overflow-hidden font-mono text-cyan-50"
			style={{
				backgroundColor: "#06121f",
				backgroundImage:
					"linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px)",
				backgroundSize: "32px 32px",
			}}
		>
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute -top-20 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_65%)] blur-2xl" />
			</div>
			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6">
				<Header />
				<main className="flex flex-1 flex-col gap-20 py-12 md:py-20">
					{/* Hero */}
					<section className="relative flex flex-col items-center gap-8 border border-cyan-400/20 bg-[#08172a]/60 p-8 text-center md:p-14">
						<CornerTicks />
						<Reveal>
							<div className="inline-flex items-center gap-2 border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-[11px] tracking-[0.25em] text-cyan-300 uppercase">
								<Crosshair className="h-3.5 w-3.5" />
								DWG · {heroCopy.eyebrow}
							</div>
						</Reveal>
						<Reveal delay={0.06}>
							<h1 className="max-w-4xl text-4xl leading-[1.05] font-bold tracking-tight md:text-6xl">
								{heroCopy.headline.split(",")[0]},
								<span className="text-cyan-400">
									{" "}
									{heroCopy.headline.split(",")[1]?.trim()}.
								</span>
							</h1>
						</Reveal>
						<Reveal delay={0.12}>
							<p className="max-w-2xl text-sm text-cyan-100/60 md:text-base">
								{heroCopy.sub}
							</p>
						</Reveal>
						<Reveal delay={0.18}>
							<div className="flex flex-col items-center gap-4">
								<SignUpButton mode="modal">
									<button
										type="button"
										className="group inline-flex items-center gap-2 border border-cyan-400 bg-cyan-400 px-7 py-3 text-sm font-bold tracking-wider text-[#06121f] uppercase transition-all hover:bg-cyan-300"
									>
										{heroCopy.cta}
										<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
									</button>
								</SignUpButton>
								<p className="flex items-center gap-2 text-[11px] tracking-wide text-cyan-100/50 uppercase">
									<MoveDiagonal className="h-3.5 w-3.5" />
									{heroCopy.trust}
								</p>
							</div>
						</Reveal>
					</section>

					{/* Use cases */}
					<section className="grid grid-cols-1 gap-px overflow-hidden border border-cyan-400/20 bg-cyan-400/20 md:grid-cols-3">
						{cases.map((c, i) => (
							<Reveal key={c.eyebrow} delay={i * 0.06}>
								<SpecCard {...c} index={i} />
							</Reveal>
						))}
					</section>

					{/* Closing */}
					<section>
						<Reveal>
							<div className="relative flex flex-col items-center gap-6 border border-dashed border-cyan-400/30 bg-[#08172a]/40 p-10 text-center md:p-14">
								<CornerTicks />
								<h2 className="max-w-2xl text-2xl font-bold tracking-tight md:text-4xl">
									Stop sending .gh files.
									<br />
									<span className="text-cyan-400">Start sending links.</span>
								</h2>
								<Link
									to="/duckerweb"
									className="inline-flex items-center gap-2 border border-cyan-400/50 px-6 py-3 text-xs font-bold tracking-wider text-cyan-300 uppercase transition-colors hover:bg-cyan-400/10"
								>
									Open DuckerWeb
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

function CornerTicks() {
	const cls = "absolute h-4 w-4 border-cyan-400/50 pointer-events-none";
	return (
		<>
			<span className={`${cls} top-0 left-0 border-t-2 border-l-2`} />
			<span className={`${cls} top-0 right-0 border-t-2 border-r-2`} />
			<span className={`${cls} bottom-0 left-0 border-b-2 border-l-2`} />
			<span className={`${cls} right-0 bottom-0 border-r-2 border-b-2`} />
		</>
	);
}

function SpecCard({
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
		<div className="group relative flex h-full flex-col gap-4 bg-[#08172a] p-8 transition-colors hover:bg-[#0a1d34]">
			<div className="flex items-center justify-between text-[11px] tracking-[0.2em] text-cyan-400/70 uppercase">
				<span className="inline-flex items-center gap-2">
					<Icon className="h-4 w-4" />
					{eyebrow}
				</span>
				<span className="text-cyan-400/40">
					R-{String(index + 1).padStart(2, "0")}
				</span>
			</div>
			<h3 className="text-xl font-bold tracking-tight text-cyan-50">{title}</h3>
			<p className="text-sm leading-relaxed text-cyan-100/55">{body}</p>
		</div>
	);
}
