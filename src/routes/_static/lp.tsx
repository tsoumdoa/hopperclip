import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LandingShell } from "@/app/components/landing/landing-shell";

export const Route = createFileRoute("/_static/lp")({
	head: () => ({ meta: [{ title: "Landing page proposals | Hopper Clip" }] }),
	component: LpIndex,
});

const proposals = [
	{
		path: "/lp1",
		name: "Pastebin / dev tool",
		summary:
			"Monospace, terminal-style demo. Leads with the analogy: a pastebin that understands Grasshopper. Quiet, technical voice.",
	},
	{
		path: "/lp2",
		name: "Show the product",
		summary:
			"Real DuckerWeb flow canvas front and center, animated in. Minimal copy. Confident, Linear-style 'show, don't tell'.",
	},
	{
		path: "/lp3",
		name: "Stop zipping .gh files",
		summary:
			"Problem-led. Before/after: chaotic attachment workflow vs. one calm link. Real flow canvas embedded as the 'after'.",
	},
	{
		path: "/lp5",
		name: "Editorial / craft",
		summary:
			"Long-form, magazine-style. Pure typography, lots of whitespace. Treats Grasshopper as a craft. No canvas.",
	},
];

function LpIndex() {
	return (
		<LandingShell>
			<section className="mx-auto w-full max-w-3xl py-10 md:py-16">
				<h1 className="text-3xl font-bold tracking-tight md:text-4xl">
					Landing page proposals
				</h1>
				<p className="mt-2 text-sm text-neutral-400">
					Five directions featuring the new Flow and Diff views in DuckerWeb.
					Click through to preview each one.
				</p>

				<ul className="mt-8 flex flex-col divide-y divide-neutral-900 rounded-xl border border-neutral-900 bg-neutral-950">
					{proposals.map((p) => (
						<li key={p.path}>
							<Link
								to={p.path}
								className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-neutral-900"
							>
								<div className="min-w-0">
									<div className="flex items-center gap-3">
										<code className="font-mono text-sm text-neutral-500">
											{p.path}
										</code>
										<span className="font-semibold">{p.name}</span>
									</div>
									<p className="mt-1 text-sm text-neutral-400">
										{p.summary}
									</p>
								</div>
								<ArrowRight className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
							</Link>
						</li>
					))}
				</ul>

				<p className="mt-6 text-xs text-neutral-600">
					Production landing (formerly lp4):{" "}
					<Link to="/" className="underline hover:text-neutral-400">
						/
					</Link>
				</p>
			</section>
		</LandingShell>
	);
}
