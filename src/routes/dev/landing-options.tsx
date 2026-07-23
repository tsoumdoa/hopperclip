import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronDown, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import OptionAuroraGlass from "@/app/dev/landing-options/option-a";
import OptionBoldGradient from "@/app/dev/landing-options/option-e";
import OptionBlueprint from "@/app/dev/landing-options/option-c";
import OptionEditorialMono from "@/app/dev/landing-options/option-b";
import OptionLightAir from "@/app/dev/landing-options/option-d";

type OptionKey = "A" | "B" | "C" | "D" | "E";

const OPTIONS: {
	key: OptionKey;
	name: string;
	blurb: string;
	Component: React.ComponentType;
}[] = [
	{
		key: "A",
		name: "Aurora Glass",
		blurb: "Dark glass · radial glows · gradient type",
		Component: OptionAuroraGlass,
	},
	{
		key: "B",
		name: "Editorial Mono",
		blurb: "Stark B&W · oversized type · hairlines",
		Component: OptionEditorialMono,
	},
	{
		key: "C",
		name: "Blueprint",
		blurb: "CAD navy · cyan · schematic",
		Component: OptionBlueprint,
	},
	{
		key: "D",
		name: "Light Air",
		blurb: "Light theme · whitespace · one accent",
		Component: OptionLightAir,
	},
	{
		key: "E",
		name: "Bold Gradient",
		blurb: "Animated mesh · oversized · playful",
		Component: OptionBoldGradient,
	},
];

export const Route = createFileRoute("/dev/landing-options")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	head: () => ({
		meta: [{ title: "Landing options · dev" }],
	}),
	component: LandingOptionsHub,
});

function LandingOptionsHub() {
	const [active, setActive] = useState<OptionKey>("A");
	const [barOpen, setBarOpen] = useState(true);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLElement) {
				const tag = e.target.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA") return;
			}
			const map: Record<string, OptionKey> = {
				"1": "A",
				"2": "B",
				"3": "C",
				"4": "D",
				"5": "E",
			};
			if (map[e.key]) setActive(map[e.key]);
			if (e.key === "h") setBarOpen((v) => !v);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const current = OPTIONS.find((o) => o.key === active)!;
	const Current = current.Component;

	return (
		<div className="relative">
			{barOpen ? (
				<div className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[oklch(0.13_0.005_270)]/85 backdrop-blur-xl">
					<div className="mx-auto flex max-w-400 items-center gap-3 px-3 py-2 md:px-6">
						<div className="hidden items-center gap-2 pr-2 text-xs text-neutral-500 sm:flex">
							<Eye className="h-3.5 w-3.5" />
							<span className="font-mono tracking-wide">
								landing · 5 options
							</span>
						</div>
						<div className="flex flex-1 flex-wrap items-center gap-1.5">
							{OPTIONS.map((o) => {
								const isActive = o.key === active;
								return (
									<button
										key={o.key}
										type="button"
										onClick={() => setActive(o.key)}
										className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
											isActive
												? "bg-white/10 ring-1 ring-white/15"
												: "hover:bg-white/5"
										}`}
									>
										<span
											className={`grid h-5 w-5 shrink-0 place-items-center rounded font-mono text-[11px] font-bold ${
												isActive
													? "bg-white text-black"
													: "bg-white/10 text-neutral-300"
											}`}
										>
											{o.key}
										</span>
										<span className="hidden md:block">
											<span className="block text-xs font-medium text-white">
												{o.name}
											</span>
											<span className="block text-[10px] text-neutral-500">
												{o.blurb}
											</span>
										</span>
										<span className="text-xs font-medium text-neutral-300 md:hidden">
											{o.name}
										</span>
									</button>
								);
							})}
						</div>
						<button
							type="button"
							onClick={() => setBarOpen(false)}
							className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
							title="Hide bar (press H)"
						>
							<span className="hidden sm:inline">hide</span>
							<ChevronDown className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setBarOpen(true)}
					className="fixed top-2 right-2 z-50 rounded-lg border border-white/10 bg-[oklch(0.13_0.005_270)]/85 px-3 py-1.5 text-[11px] text-neutral-300 backdrop-blur-xl transition-colors hover:bg-white/10"
					title="Show bar (press H)"
				>
					options ({active})
				</button>
			)}
			<div className={barOpen ? "pt-[3.25rem] sm:pt-[3.5rem]" : ""}>
				<Current />
			</div>
		</div>
	);
}
