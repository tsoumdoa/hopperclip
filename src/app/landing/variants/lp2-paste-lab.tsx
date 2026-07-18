import { useCallback, useEffect, useState } from "react";
import { FileUp, Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModifierKeyLabel } from "@/app/hooks/use-modifier-key-label";
import { PrimarySignUp, SecondaryDuckerLink } from "../ctas";

type Phase = "idle" | "catching" | "validating" | "ready";

export function Lp2PasteLab() {
	const modifier = useModifierKeyLabel();
	const [phase, setPhase] = useState<Phase>("idle");
	const [source, setSource] = useState<"paste" | "drop" | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const [flash, setFlash] = useState(false);

	const runImport = useCallback((next: "paste" | "drop") => {
		setSource(next);
		setPhase("catching");
		window.setTimeout(() => setPhase("validating"), 450);
		window.setTimeout(() => setPhase("ready"), 1100);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isPaste =
				(event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v";
			if (!isPaste) return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			event.preventDefault();
			setFlash(true);
			window.setTimeout(() => setFlash(false), 200);
			runImport("paste");
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [runImport]);

	return (
		<div className="pb-16">
			<section className="relative flex min-h-[72vh] flex-col justify-center pt-4">
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-0 transition-opacity duration-500",
						flash ? "opacity-100" : "opacity-0"
					)}
					style={{
						background:
							"radial-gradient(ellipse at center, rgba(255,255,255,0.08), transparent 55%)",
					}}
				/>

				<div className="relative z-10 mx-auto max-w-3xl text-center">
					<p className="text-5xl font-bold tracking-tight md:text-7xl">
						Hopper Clip
					</p>
					<h1 className="mt-4 text-2xl font-semibold text-neutral-100 md:text-3xl">
						Paste a definition. Skip the zip.
					</h1>
					<p className="mx-auto mt-4 max-w-xl text-base text-neutral-400 md:text-lg">
						Native {modifier}+V imports GhXml without clipboard permission
						prompts. Or drop a{" "}
						<code className="rounded bg-neutral-800 px-1.5 py-0.5 text-sm">
							.gh
						</code>{" "}
						/{" "}
						<code className="rounded bg-neutral-800 px-1.5 py-0.5 text-sm">
							.ghx
						</code>{" "}
						file — same pipeline.
					</p>
				</div>

				<div
					className={cn(
						"relative z-10 mx-auto mt-10 w-full max-w-2xl overflow-hidden rounded-2xl border transition-all duration-300",
						dragOver
							? "border-white bg-neutral-900 scale-[1.01]"
							: "border-neutral-700 bg-neutral-950",
						phase === "ready" && "border-emerald-500/40"
					)}
					onDragEnter={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragOver={(e) => e.preventDefault()}
					onDragLeave={() => setDragOver(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragOver(false);
						runImport("drop");
					}}
				>
					<div className="flex min-h-56 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
						{phase === "idle" || phase === "catching" ? (
							<>
								<div className="flex items-center gap-3 text-neutral-300">
									<span className="inline-flex items-center gap-2 rounded-md border border-neutral-600 px-3 py-1.5 font-mono text-sm">
										{modifier}+V
									</span>
									<span className="text-neutral-600">or</span>
									<span className="inline-flex items-center gap-2 rounded-md border border-neutral-600 px-3 py-1.5 text-sm">
										<FileUp className="h-4 w-4" />
										Drop .gh
									</span>
								</div>
								<p className="max-w-sm text-sm text-neutral-500">
									Press {modifier}+V anywhere on this page, click Simulate paste,
									or drop a file on this zone.
								</p>
								<button
									type="button"
									onClick={() => runImport("paste")}
									className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
								>
									Simulate paste
								</button>
							</>
						) : null}

						{phase === "validating" ? (
							<div className="flex flex-col items-center gap-3">
								<div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
								<p className="text-sm text-neutral-300">
									Validating GhXml from {source === "drop" ? "file" : "clipboard"}…
								</p>
							</div>
						) : null}

						{phase === "ready" ? (
							<div className="flex w-full max-w-md flex-col items-stretch gap-4 animate-in fade-in duration-500">
								<div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
									<Sparkles className="mt-0.5 h-4 w-4 text-emerald-300" />
									<div>
										<p className="text-sm font-medium text-emerald-100">
											Definition ready
										</p>
										<p className="mt-1 text-xs text-emerald-200/70">
											Sun path · 12 components · imported via{" "}
											{source === "drop" ? "file drop" : `${modifier}+V`}
										</p>
									</div>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3">
									<div className="flex items-center gap-2 text-sm text-neutral-300">
										<Link2 className="h-4 w-4 text-neutral-500" />
										hopperclip.com/s/sun-path
									</div>
									<span className="text-xs text-neutral-500">shareable</span>
								</div>
								<button
									type="button"
									onClick={() => {
										setPhase("idle");
										setSource(null);
									}}
									className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
								>
									Reset demo
								</button>
							</div>
						) : null}
					</div>

					{phase === "catching" ? (
						<div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-neutral-800">
							<div className="h-full w-1/2 animate-pulse bg-white" />
						</div>
					) : null}
				</div>

				<div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3">
					<PrimarySignUp label="Start clipping" />
					<SecondaryDuckerLink label="Paste into DuckerWeb" />
				</div>
			</section>

			<section className="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
				<div>
					<h2 className="text-lg font-semibold">Cards & Diff share the same paste</h2>
					<p className="mt-2 text-sm text-neutral-400">
						On /ghcards, paste opens create-card. In DuckerWeb Diff, paste targets
						the comparison definition. Field pastes stay normal.
					</p>
				</div>
				<div>
					<h2 className="text-lg font-semibold">Native .gh decoding</h2>
					<p className="mt-2 text-sm text-neutral-400">
						Saved Grasshopper binaries inflate client-side into GhXml — no
						server round-trip for the import path.
					</p>
				</div>
			</section>
		</div>
	);
}
