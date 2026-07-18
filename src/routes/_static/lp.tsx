import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingShell, LANDING_VARIANTS } from "@/app/landing/shell";

export const Route = createFileRoute("/_static/lp")({
	head: () => ({
		meta: [{ title: "Hopper Clip — Landing variants" }],
	}),
	component: LandingGallery,
});

function LandingGallery() {
	return (
		<LandingShell active="/lp">
			<div className="mx-auto max-w-3xl py-10">
				<p className="text-4xl font-bold tracking-tight md:text-5xl">
					Hopper Clip
				</p>
				<h1 className="mt-4 text-2xl font-semibold">Landing variant gallery</h1>
				<p className="mt-3 text-neutral-400">
					Five interactive proposals reflecting Diff, native paste, .gh import,
					and expression inspect. Pick one to promote to{" "}
					<code className="rounded bg-neutral-800 px-1.5 py-0.5 text-sm">/</code>{" "}
					later.
				</p>
				<ul className="mt-10 space-y-3">
					{LANDING_VARIANTS.map((variant) => (
						<li key={variant.path}>
							<Link
								to={variant.path}
								className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4 transition-colors hover:border-neutral-500 hover:bg-neutral-900"
							>
								<div>
									<p className="font-medium">{variant.title}</p>
									<p className="mt-1 font-mono text-xs text-neutral-500">
										{variant.path}
									</p>
								</div>
								<span className="rounded-md bg-neutral-800 px-2.5 py-1 font-mono text-sm">
									{variant.label}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</LandingShell>
	);
}
