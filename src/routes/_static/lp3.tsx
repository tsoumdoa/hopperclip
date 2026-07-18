import { createFileRoute } from "@tanstack/react-router";
import { SignUpButton } from "@clerk/tanstack-react-start";
import { motion } from "motion/react";
import {
	Archive,
	Mail,
	Clock,
	Link2,
	ArrowRight,
	FileWarning,
} from "lucide-react";
import { LandingShell } from "@/app/components/landing/landing-shell";
import { FlowFrame } from "@/app/components/landing/flow-frame";
import { Reveal } from "@/app/components/landing/reveal";
import { useSampleFlow } from "@/app/components/landing/use-sample-flow";

export const Route = createFileRoute("/_static/lp3")({
	head: () => ({ meta: [{ title: "Hopper Clip — Stop zipping .gh files" }] }),
	component: Lp3,
});

const pains = [
	{ icon: Archive, label: "ZIP, then attach" },
	{ icon: Mail, label: "25MB bounce" },
	{ icon: Clock, label: "WeTransfer expires" },
	{ icon: Link2, label: "Drive link rots" },
	{ icon: FileWarning, label: "Wrong version" },
];

function Lp3() {
	const sample = useSampleFlow();

	return (
		<LandingShell>
			<section className="mx-auto flex w-full max-w-4xl flex-col gap-5 py-10 md:py-16">
				<motion.h1
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
					className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
				>
					Stop zipping{" "}
					<code className="rounded bg-neutral-900 px-2 py-0.5 font-mono text-3xl text-neutral-300 md:text-5xl">
						.gh
					</code>{" "}
					files.
				</motion.h1>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.15 }}
					className="max-w-xl text-base text-neutral-400 md:text-lg"
				>
					Email bounces at 25&nbsp;MB. WeTransfer expires. Drive links rot.
					There&apos;s a better way to share a Grasshopper definition — one
					short link, opened in any browser.
				</motion.p>
			</section>

			<section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1.4fr]">
				<Reveal className="flex flex-col gap-2">
					<div className="font-mono text-xs uppercase tracking-[0.2em] text-rose-400/80">
						before
					</div>
					<ul className="flex flex-col gap-2">
						{pains.map((p) => (
							<li
								key={p.label}
								className="flex items-center gap-3 rounded-md border border-neutral-900 bg-neutral-950 px-3 py-2 text-sm text-neutral-400 line-through decoration-rose-500/40"
							>
								<p.icon className="h-4 w-4 shrink-0 text-neutral-600" />
								{p.label}
							</li>
						))}
					</ul>
				</Reveal>

				<Reveal
					delay={0.15}
					className="flex items-center justify-center md:flex-col"
				>
					<ArrowRight className="h-6 w-6 text-neutral-700 md:rotate-90" />
				</Reveal>

				<Reveal delay={0.2} className="flex flex-col gap-3">
					<div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400/80">
						after
					</div>
					<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
						<div className="font-mono text-sm text-emerald-200">
							hopclip.app/c/3kf2a9
						</div>
						<div className="mt-1 text-xs text-neutral-500">
							one link · opens in any browser · never expires
						</div>
					</div>
				</Reveal>
			</section>

			<Reveal className="mx-auto mt-16 w-full max-w-5xl">
				<p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-600">
					and when they get there
				</p>
				<div className="h-[360px] w-full md:h-[460px]">
					<FlowFrame sample={sample} className="h-full" />
				</div>
				<p className="mt-4 max-w-2xl text-sm text-neutral-400 md:text-base">
					The link opens to the actual Grasshopper graph — every component,
					wire, and parameter, in a browser. They can list components, view the
					raw JSON, or drop in a second file to see what changed between two
					versions.
				</p>
			</Reveal>

			<Reveal className="mx-auto mt-12 w-full max-w-5xl">
				<div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-neutral-900 bg-neutral-950 px-6 py-5 sm:flex-row sm:items-center">
					<div>
						<div className="text-base font-medium">Share your next definition properly.</div>
						<div className="text-sm text-neutral-500">Free to start.</div>
					</div>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
						>
							Get started
							<ArrowRight className="h-4 w-4" />
						</button>
					</SignUpButton>
				</div>
			</Reveal>
		</LandingShell>
	);
}
