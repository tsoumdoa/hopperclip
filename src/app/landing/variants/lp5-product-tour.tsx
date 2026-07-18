import { useEffect, useState } from "react";
import {
	ClipboardPaste,
	FileUp,
	GitCompareArrows,
	Asterisk,
	Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModifierKeyLabel } from "@/app/hooks/use-modifier-key-label";
import { PrimarySignUp, SecondaryDuckerLink } from "../ctas";

const STEPS = [
	{
		id: "import",
		title: "Import",
		icon: FileUp,
		headline: "Drop .gh or paste GhXml",
		body: "Native binary .gh decoding and clipboard paste feed the same validation path — cards and DuckerWeb alike.",
	},
	{
		id: "share",
		title: "Share",
		icon: Share2,
		headline: "Ship a link, not a zip",
		body: "Tag it, save it, send a short URL. Recipients open the definition in-browser and copy XML when they need it.",
	},
	{
		id: "diff",
		title: "Diff",
		icon: GitCompareArrows,
		headline: "Compare logic, not layout",
		body: "Match by instance GUID. Overlay added / modified / removed. Port changes get readable summaries; layout-only moves stay quiet.",
	},
	{
		id: "inspect",
		title: "Inspect",
		icon: Asterisk,
		headline: "Pin the expression",
		body: "Hover the * badge, click to pin, select and copy the formula. Escape dismisses — built for reading, not guessing.",
	},
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function Lp5ProductTour() {
	const modifier = useModifierKeyLabel();
	const [step, setStep] = useState(0);
	const [auto, setAuto] = useState(true);
	const current = STEPS[step]!;

	useEffect(() => {
		if (!auto) return;
		const id = window.setInterval(() => {
			setStep((s) => (s + 1) % STEPS.length);
		}, 3800);
		return () => window.clearInterval(id);
	}, [auto]);

	return (
		<div className="pb-16">
			<section className="pt-4 text-center">
				<p className="text-5xl font-bold tracking-tight md:text-6xl">
					Hopper Clip
				</p>
				<h1 className="mx-auto mt-4 max-w-2xl text-2xl font-semibold md:text-3xl">
					From clipboard to Diff in four beats.
				</h1>
				<p className="mx-auto mt-3 max-w-lg text-neutral-400">
					A guided tour of what just shipped — pause anytime and click a step.
				</p>
			</section>

			<section className="mx-auto mt-10 max-w-4xl">
				<div className="mb-6 flex flex-wrap items-center justify-center gap-2">
					{STEPS.map((s, index) => {
						const Icon = s.icon;
						const active = index === step;
						return (
							<button
								key={s.id}
								type="button"
								onClick={() => {
									setAuto(false);
									setStep(index);
								}}
								className={cn(
									"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all",
									active
										? "bg-white text-black"
										: "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
								)}
							>
								<Icon className="h-3.5 w-3.5" />
								{s.title}
							</button>
						);
					})}
					<button
						type="button"
						onClick={() => setAuto((v) => !v)}
						className="ml-2 text-xs text-neutral-600 underline-offset-2 hover:text-neutral-400 hover:underline"
					>
						{auto ? "Pause" : "Autoplay"}
					</button>
				</div>

				<div className="relative overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950">
					<div
						className="absolute inset-x-0 top-0 h-0.5 bg-neutral-800"
						aria-hidden
					>
						<div
							key={`${current.id}-${auto}`}
							className={cn(
								"h-full bg-white",
								auto && "animate-[tourProgress_3.8s_linear]"
							)}
							style={auto ? undefined : { width: "100%" }}
						/>
					</div>

					<div className="grid gap-0 md:grid-cols-2">
						<div className="flex flex-col justify-center p-8 md:p-10">
							<p className="font-mono text-xs text-neutral-500">
								Step {step + 1} / {STEPS.length}
							</p>
							<h2 className="mt-3 text-2xl font-semibold">{current.headline}</h2>
							<p className="mt-3 text-neutral-400">{current.body}</p>
							<div className="mt-8 flex flex-wrap gap-3">
								<PrimarySignUp label="Get Started Free" />
								{current.id === "diff" || current.id === "inspect" ? (
									<SecondaryDuckerLink />
								) : (
									<SecondaryDuckerLink label="Open DuckerWeb" />
								)}
							</div>
						</div>

						<div className="relative min-h-64 border-t border-neutral-800 md:border-t-0 md:border-l">
							<StepStage stepId={current.id} modifier={modifier} />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

function StepStage({
	stepId,
	modifier,
}: {
	stepId: StepId;
	modifier: string;
}) {
	if (stepId === "import") {
		return (
			<div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 bg-[#141412] p-8">
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center gap-2 rounded-md border border-neutral-600 px-3 py-2 font-mono text-sm text-neutral-200">
						<ClipboardPaste className="h-4 w-4" />
						{modifier}+V
					</span>
					<span className="text-neutral-600">/</span>
					<span className="inline-flex items-center gap-2 rounded-md border border-dashed border-neutral-500 px-3 py-2 text-sm text-neutral-300">
						<FileUp className="h-4 w-4" />
						.gh · .ghx
					</span>
				</div>
				<p className="text-center text-xs text-neutral-500">
					No permission prompt · client-side decode
				</p>
			</div>
		);
	}

	if (stepId === "share") {
		return (
			<div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 bg-neutral-900 p-8">
				<div className="w-full max-w-xs rounded-lg border border-neutral-700 bg-black px-4 py-3">
					<p className="text-sm font-medium">Sun path utility</p>
					<p className="mt-1 text-xs text-neutral-500">#solar · #analysis</p>
					<p className="mt-3 font-mono text-xs text-neutral-400">
						hopperclip.com/s/a7k2
					</p>
				</div>
				<p className="text-xs text-neutral-500">Shareable in one click</p>
			</div>
		);
	}

	if (stepId === "diff") {
		return (
			<div
				className="relative flex h-full min-h-64 items-center justify-center p-6"
				style={{ backgroundColor: "#ccc9c0" }}
			>
				<div className="absolute top-4 left-4 flex gap-2 text-[10px] font-semibold">
					<span className="rounded bg-green-500/25 px-2 py-0.5 text-green-900">
						+2
					</span>
					<span className="rounded bg-yellow-400/35 px-2 py-0.5 text-yellow-950">
						~3
					</span>
					<span className="rounded bg-red-500/25 px-2 py-0.5 text-red-900">
						−1
					</span>
				</div>
				<div className="flex gap-3">
					<div className="rounded-sm bg-[#b8b5ae] px-3 py-2 text-xs ring-2 ring-yellow-500/70">
						Move
					</div>
					<div className="rounded-sm bg-[#f5f07a] px-3 py-2 text-xs ring-2 ring-green-500/70">
						Cull
					</div>
					<div className="rounded-sm bg-[#b8b5ae] px-3 py-2 text-xs opacity-50 ring-2 ring-red-500/70">
						Panel
					</div>
				</div>
				<p className="absolute right-4 bottom-4 left-4 rounded bg-black/70 px-3 py-2 text-[11px] text-neutral-200">
					Input G: Mapping Flatten · Expression added
				</p>
			</div>
		);
	}

	return (
		<div
			className="relative flex h-full min-h-64 items-center justify-center p-6"
			style={{ backgroundColor: "#ccc9c0" }}
		>
			<div className="relative rounded-sm bg-[#f5f07a] px-4 py-3 text-sm font-medium text-neutral-900">
				Number
				<span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 font-mono text-[10px] text-neutral-900">
					*
				</span>
			</div>
			<div className="absolute top-1/2 left-1/2 mt-10 w-52 -translate-x-1/2 rounded-md border border-neutral-600 bg-neutral-950 p-3 shadow-xl">
				<p className="text-[10px] text-neutral-500 uppercase">Pinned expression</p>
				<p className="mt-1 font-mono text-xs text-amber-100">Sin(t) * Radius</p>
			</div>
		</div>
	);
}
