import { createFileRoute } from "@tanstack/react-router";
import { SignUpButton } from "@clerk/tanstack-react-start";
import { LandingShell } from "@/app/components/landing/landing-shell";
import { Reveal } from "@/app/components/landing/reveal";

export const Route = createFileRoute("/_static/lp1")({
	head: () => ({ meta: [{ title: "Hopper Clip — Pastebin for Grasshopper" }] }),
	component: Lp1,
});

const bullets = [
	"Drop a .gh, .ghx, or paste GhXml — get a short URL back.",
	"Anyone with the link opens it in a browser, no Rhino, no install.",
	"They can explore the graph, list components, or diff two versions.",
	"You keep a searchable library of everything you've shared.",
];

function Lp1() {
	return (
		<LandingShell>
			<section className="mx-auto flex w-full max-w-3xl flex-col gap-12 py-12 md:py-20">
				<div className="flex flex-col gap-5">
					<span className="font-mono text-xs text-neutral-500">
						// hopperclip.app
					</span>
					<h1 className="font-mono text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
						A pastebin that speaks{" "}
						<span className="text-neutral-500">Grasshopper.</span>
					</h1>
					<p className="max-w-xl text-base text-neutral-400 md:text-lg">
						Grasshopper definitions have always been awkward to share —
						too big for chat, too obscure for Drive, too tied to a single
						Rhino install. Hopper Clip is the missing piece.
					</p>
				</div>

				<Reveal>
					<Terminal />
				</Reveal>

				<ul className="flex flex-col gap-3">
					{bullets.map((b, i) => (
						<Reveal key={b} delay={i * 0.05}>
							<li className="flex gap-3 text-sm text-neutral-300 md:text-base">
								<span className="mt-1 font-mono text-xs text-neutral-600">
									0{i + 1}
								</span>
								<span>{b}</span>
							</li>
						</Reveal>
					))}
				</ul>

				<div>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
						>
							Get a link
						</button>
					</SignUpButton>
				</div>
			</section>
		</LandingShell>
	);
}

function Terminal() {
	return (
		<div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-sm shadow-2xl shadow-black/40">
			<div className="flex items-center gap-1.5 border-b border-neutral-800 bg-neutral-900/60 px-4 py-2.5">
				<span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
				<span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
				<span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
				<span className="ml-2 text-xs text-neutral-500">zsh</span>
			</div>
			<div className="flex flex-col gap-2 px-4 py-5 leading-relaxed">
				<Line prompt="$" cmd="hopperclip drop facade-study.gh" />
				<Line muted output="  parsed 1,284 components · 3.1 MB" />
				<Line muted output="  uploading…" />
				<Line
					prompt="$"
					cmd="hopclip.app/c/3kf2a9"
					highlight
					cursor
				/>
				<div className="mt-2 pl-3 text-xs text-neutral-600">
					share it. anyone can open it in a browser.
				</div>
			</div>
		</div>
	);
}

function Line({
	prompt,
	cmd,
	output,
	muted,
	highlight,
	cursor,
}: {
	prompt?: string;
	cmd?: string;
	output?: string;
	muted?: boolean;
	highlight?: boolean;
	cursor?: boolean;
}) {
	if (output) {
		return (
			<div className={`pl-1 ${muted ? "text-neutral-500" : "text-neutral-400"}`}>
				{output}
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2">
			{prompt && <span className="text-emerald-400">{prompt}</span>}
			{cmd && (
				<span
					className={
						highlight
							? "rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300"
							: "text-neutral-200"
					}
				>
					{cmd}
				</span>
			)}
			{cursor && (
				<span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-400/70 align-middle" />
			)}
		</div>
	);
}
