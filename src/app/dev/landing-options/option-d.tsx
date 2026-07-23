import { SignUpButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plug } from "lucide-react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { cases, heroCopy } from "./shared";

export default function OptionLightAir() {
	return (
		<div className="min-h-screen bg-[oklch(0.985_0.001_270)] font-sans text-[oklch(0.18_0.01_270)]">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(ellipse_at_top,oklch(0.93_0.03_277),transparent_60%)]"
			/>
			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6">
				<Header />
				<main className="relative flex flex-1 flex-col items-center gap-24 py-16 md:py-28">
					{/* Hero */}
					<section className="flex flex-col items-center gap-7 text-center">
						<Reveal>
							<span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.9_0.02_277)] bg-white px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm">
								<span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
								{heroCopy.eyebrow}
							</span>
						</Reveal>
						<Reveal delay={0.06}>
							<h1 className="max-w-4xl text-5xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-[oklch(0.15_0.01_270)] md:text-7xl">
								{heroCopy.headline.split(",")[0]},{" "}
								<span className="text-indigo-600">
									{heroCopy.headline.split(",")[1]?.trim()}.
								</span>
							</h1>
						</Reveal>
						<Reveal delay={0.12}>
							<p className="mx-auto max-w-2xl text-lg text-balance text-[oklch(0.45_0.01_270)] md:text-xl">
								{heroCopy.sub}
							</p>
						</Reveal>
						<Reveal delay={0.18}>
							<div className="flex flex-col items-center gap-3">
								<SignUpButton mode="modal">
									<button
										type="button"
										className="group inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 md:text-base"
									>
										{heroCopy.cta}
										<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
									</button>
								</SignUpButton>
								<div className="flex items-center gap-2 text-sm text-[oklch(0.5_0.01_270)]">
									<Plug className="h-4 w-4 shrink-0 text-indigo-400" />
									{heroCopy.trust}
								</div>
							</div>
						</Reveal>
					</section>

					{/* Use cases */}
					<section className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
						{cases.map((c, i) => (
							<Reveal key={c.eyebrow} delay={i * 0.08}>
								<Card {...c} />
							</Reveal>
						))}
					</section>

					{/* Closing */}
					<section className="w-full max-w-5xl">
						<Reveal>
							<div className="flex flex-col items-center gap-6 rounded-3xl border border-[oklch(0.9_0.02_277)] bg-white p-10 text-center shadow-xl shadow-indigo-600/5 md:p-16">
								<h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-balance text-[oklch(0.15_0.01_270)] md:text-4xl">
									Stop sending .gh files. Start sending links.
								</h2>
								<Link
									to="/duckerweb"
									className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.88_0.02_277)] bg-white px-6 py-3 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
								>
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
		<div className="group flex h-full flex-col gap-4 rounded-2xl border border-[oklch(0.9_0.02_277)] bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/10">
			<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<Icon className="h-5 w-5" />
			</div>
			<div className="text-xs font-medium tracking-wide text-indigo-500 uppercase">
				{eyebrow}
			</div>
			<h3 className="text-xl font-semibold tracking-[-0.01em] text-[oklch(0.15_0.01_270)]">
				{title}
			</h3>
			<p className="text-sm leading-relaxed text-[oklch(0.45_0.01_270)]">
				{body}
			</p>
		</div>
	);
}
