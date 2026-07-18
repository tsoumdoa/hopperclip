import { createFileRoute, Link } from "@tanstack/react-router";
import { SignUpButton } from "@clerk/tanstack-react-start";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { LandingShell } from "@/app/components/landing/landing-shell";
import { FlowFrame } from "@/app/components/landing/flow-frame";
import { Reveal } from "@/app/components/landing/reveal";
import { useSampleFlow } from "@/app/components/landing/use-sample-flow";

export const Route = createFileRoute("/_static/lp2")({
	head: () => ({ meta: [{ title: "Hopper Clip — Send a link, not a file" }] }),
	component: Lp2,
});

function Lp2() {
	const sample = useSampleFlow();

	return (
		<LandingShell>
			<section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 py-8 md:py-12">
				<motion.h1
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
					className="max-w-3xl text-center text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl"
				>
					Send a link, not a file.
				</motion.h1>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.15 }}
					className="max-w-xl text-center text-base text-neutral-400 md:text-lg"
				>
					When someone opens a Hopper Clip, this is what they see — the full
					Grasshopper graph, in any browser, no Rhino required.
				</motion.p>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					className="flex flex-wrap items-center justify-center gap-3"
				>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
						>
							Get started
							<ArrowRight className="h-4 w-4" />
						</button>
					</SignUpButton>
					<Link
						to="/duckerweb"
						className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-6 py-3 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
					>
						Try with your definition
					</Link>
				</motion.div>
			</section>

			<motion.div
				initial={{ opacity: 0, y: 24, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
				className="mx-auto h-[420px] w-full max-w-5xl md:h-[520px]"
			>
				<FlowFrame sample={sample} className="h-full" />
			</motion.div>

			<section className="mx-auto mt-16 grid w-full max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900 md:grid-cols-3">
				<ValueCell
					step="Share"
					body="Drop a .gh or paste GhXml, get a short link. No attachments, no zip, no upload to Drive."
				/>
				<ValueCell
					step="Explore"
					body="Recipients open the link in any browser. Pan, zoom, and inspect the whole graph — list and JSON views too."
				/>
				<ValueCell
					step="Compare"
					body="Drop in a second file to diff two versions. Added, removed, modified, and rewired — all highlighted."
				/>
			</section>

			<Reveal className="mx-auto mt-12 max-w-5xl">
				<div className="rounded-xl border border-neutral-900 bg-neutral-950 px-6 py-5 text-center">
					<p className="text-sm text-neutral-400">
						Built for designers who share Grasshopper work every week.
					</p>
					<p className="mt-1 font-mono text-xs text-neutral-600">
						free · no credit card · works in any modern browser
					</p>
				</div>
			</Reveal>
		</LandingShell>
	);
}

function ValueCell({ step, body }: { step: string; body: string }) {
	return (
		<div className="flex flex-col gap-2 bg-black p-6">
			<div className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
				{step}
			</div>
			<p className="text-sm text-neutral-300 md:text-base">{body}</p>
		</div>
	);
}
