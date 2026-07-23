import { SignUpButton, useAuth } from "@clerk/tanstack-react-start";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowRight,
	Boxes,
	FileCode2,
	GitCompareArrows,
	Layers,
	MessageSquare,
	MousePointerClick,
	Plug,
	Share2,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { AuthLoadingScreen } from "@/app/components/auth-loading-screen";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { Reveal } from "@/app/components/landing/reveal";
import { fetchClerkAuth } from "./__root";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [{ title: "Hopper Clip — Grasshopper, sorted" }],
	}),
	beforeLoad: async () => {
		const { userId } = await fetchClerkAuth();
		if (userId) {
			throw redirect({ to: "/ghcards" });
		}
	},
	pendingComponent: AuthLoadingScreen,
	component: Home,
});

function Home() {
	const { isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			navigate({ to: "/ghcards" });
		}
	}, [isLoaded, isSignedIn, navigate]);

	if (!isLoaded) {
		return <AuthLoadingScreen />;
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-[oklch(0.13_0.005_270)] font-sans text-white">
			<BackdropGlow />
			<div className="relative mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6 md:pb-2 2xl:px-10 2xl:pt-8">
				<Header />
				{isSignedIn ? <SignedInLandingContent /> : <LandingPageContent />}
				<Footer />
			</div>
		</div>
	);
}

function BackdropGlow() {
	const { scrollYProgress } = useScroll();
	const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
			<div className="bg-grid mask-radial-fade absolute inset-0 opacity-70" />
			<motion.div
				style={{ y }}
				className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.30),transparent_62%)] blur-2xl"
			/>
			<div className="absolute top-[18%] -left-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.7_0.16_220/0.16),transparent_62%)] blur-2xl" />
			<div className="absolute top-[10%] -right-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.68_0.2_330/0.14),transparent_62%)] blur-2xl" />
			<div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[oklch(0.13_0.005_270)]" />
		</div>
	);
}

function SignedInLandingContent() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-12 md:py-20">
			<div className="flex flex-col items-center gap-6 text-center">
				<h1 className="text-3xl font-bold md:text-5xl">
					Welcome back to Hopper Clip
				</h1>
				<p className="text-lg text-neutral-400 md:text-xl">
					Head to your cards to manage and share your Grasshopper definitions.
				</p>
				<Link
					to="/ghcards"
					className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200 md:text-base"
				>
					Go to My Cards
					<ArrowRight className="h-4 w-4" />
				</Link>
			</div>
		</div>
	);
}

const cases = [
	{
		icon: MessageSquare,
		eyebrow: "Share for review",
		title: "Send one link instead of an attachment.",
		body: "Drop a .gh, get a URL. Reviewers open it in any browser — no Rhino, no plugins, no setup. Comments stay in your existing tools.",
	},
	{
		icon: MousePointerClick,
		eyebrow: "Inspect without Rhino",
		title: "Read the whole graph at a glance.",
		body: "Pan and zoom every component, wire, slider, and panel. Switch to a flat list for an inventory, or JSON for the raw structure.",
	},
	{
		icon: GitCompareArrows,
		eyebrow: "Diff between versions",
		title: "See what changed, not what's there.",
		body: "Drop in a second file to compare two versions. Added, removed, modified, and rewired components are highlighted — wire by wire.",
	},
];

const features = [
	{
		icon: Layers,
		title: "Snippet library",
		body: "Save definitions as cards with tags, titles, and descriptions — a real library, not a folder of mystery .gh files.",
	},
	{
		icon: Share2,
		title: "One-link sharing",
		body: "Generate a shareable URL for any card. Revoke or regenerate access whenever you want.",
	},
	{
		icon: GitCompareArrows,
		title: "Version diffing",
		body: "Compare two files side-by-side and see exactly which components were added, removed, or rewired.",
	},
	{
		icon: Boxes,
		title: "Graph · list · JSON",
		body: "Three views for every definition: the visual canvas, a flat component inventory, or raw structured JSON.",
	},
	{
		icon: FileCode2,
		title: "Copy as GhXml",
		body: "Paste Grasshopper XML directly — no file needed. Great for quick lookups and ad-hoc reviews.",
	},
	{
		icon: ShieldCheck,
		title: "Yours to self-host",
		body: "Open-source and self-hostable. Use the hosted app or run your own — your definitions stay under your control.",
	},
];

const stats = [
	{ value: "0", label: "plugins to install" },
	{ value: "3", label: "views per definition" },
	{ value: "100%", label: "runs in the browser" },
	{ value: "MIT", label: "open-source license" },
];

const faqs = [
	{
		q: "Do I need Rhino or Grasshopper installed?",
		a: "No. Hopper Clip runs entirely in the browser. Anyone you share a link with can inspect, review, and compare definitions without a single install — no Rhino, no Grasshopper, no plugins.",
	},
	{
		q: "How does the version diff work?",
		a: "Drop in two .gh files (or paste GhXml) and Hopper Clip highlights what changed between them: added, removed, modified, and rewired components are outlined wire-by-wire so you can review a change instead of the whole graph.",
	},
	{
		q: "Is my data uploaded to a server?",
		a: "Inspection and diffing run locally in your browser. Definitions you choose to save as cards are stored against your account so you can manage and reshare them later.",
	},
	{
		q: "What is DuckerWeb?",
		a: "DuckerWeb is our free, browser-only viewer — the same engine that powers inspection — available with no account required. Hopper Clip adds the library, sharing, and review workflow on top.",
	},
	{
		q: "Can I self-host it?",
		a: "Yes. Hopper Clip is open-source under the MIT license. Use the hosted version at hopperclip.com, or clone the repo and run your own.",
	},
];

function LandingPageContent() {
	return (
		<>
			<Hero />
			<SocialProof />
			<UseCases />
			<FeatureGrid />
			<DuckerWebBanner />
			<FaqSection />
			<FinalCta />
		</>
	);
}

function Container({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`mx-auto w-full max-w-6xl min-[2200px]:max-w-[100rem] 2xl:max-w-[88rem] ${className}`}
		>
			{children}
		</div>
	);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
			<span className="relative flex h-1.5 w-1.5">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
				<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
			</span>
			{children}
		</div>
	);
}

function Hero() {
	return (
		<section className="relative flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center min-[2200px]:py-32 md:py-24">
			<Reveal>
				<Eyebrow>for individuals &amp; teams</Eyebrow>
			</Reveal>

			<Reveal delay={0.06}>
				<h1 className="max-w-4xl text-5xl leading-[1.02] font-semibold tracking-tight text-balance min-[2200px]:text-8xl md:text-7xl 2xl:text-8xl">
					<span className="text-gradient">Grasshopper,</span>{" "}
					<br className="hidden sm:block" />
					<span className="bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
						reviewed.
					</span>
				</h1>
			</Reveal>

			<Reveal delay={0.12}>
				<p className="mx-auto max-w-2xl text-lg text-balance text-neutral-400 min-[2200px]:text-2xl md:text-xl">
					Organize your own Grasshopper definitions. Share them with a team to
					inspect, compare, and review across versions — without anyone needing
					Rhino in front of them.
				</p>
			</Reveal>

			<Reveal delay={0.18}>
				<div className="flex flex-col items-center gap-4">
					<SignUpButton mode="modal">
						<button
							type="button"
							className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-[0_0_40px_-8px_oklch(0.62_0.19_277/0.6)] transition-all hover:bg-neutral-200 hover:shadow-[0_0_50px_-6px_oklch(0.62_0.19_277/0.8)] md:text-base"
						>
							Get started — it's free
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
						</button>
					</SignUpButton>
					<div className="flex items-center gap-2 text-sm text-neutral-400">
						<Plug className="h-4 w-4 shrink-0 text-neutral-500" />
						Nothing to install — no Rhino, no plugins, no setup for whoever
						opens the link.
					</div>
				</div>
			</Reveal>

			<Reveal delay={0.24}>
				<HeroPreview />
			</Reveal>
		</section>
	);
}

function HeroPreview() {
	return (
		<div className="relative mt-4 w-full max-w-5xl">
			<div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.62_0.19_277/0.22),transparent_70%)] blur-xl" />
			<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-sm">
				<div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
					<span className="h-3 w-3 rounded-full bg-red-400/70" />
					<span className="h-3 w-3 rounded-full bg-yellow-400/70" />
					<span className="h-3 w-3 rounded-full bg-green-400/70" />
					<span className="ml-3 font-mono text-xs text-neutral-500">
						hopperclip.com/ghcards/panel-facade
					</span>
				</div>
				<div className="bg-grid relative aspect-[16/9] w-full overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0.13_0.005_270)_85%)]" />
					<FauxGraph />
				</div>
			</div>
		</div>
	);
}

function FauxGraph() {
	return (
		<div className="absolute inset-0 p-6 md:p-10">
			<div className="relative h-full w-full">
				<Node style={{ top: "8%", left: "6%" }} label="Surface" tone="io" />
				<Node
					style={{ top: "10%", left: "42%" }}
					label="Panel Grid"
					tone="param"
				/>
				<Node style={{ top: "44%", left: "12%" }} label="Evaluate" tone="io" />
				<Node
					style={{ top: "48%", left: "46%" }}
					label="Dispatch"
					tone="param"
				/>
				<Node style={{ top: "70%", left: "72%" }} label="Preview" tone="io" />
				<svg className="absolute inset-0 h-full w-full" aria-hidden>
					<defs>
						<linearGradient id="wire" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stopColor="oklch(0.7 0.16 277)" />
							<stop offset="100%" stopColor="oklch(0.7 0.16 330)" />
						</linearGradient>
					</defs>
					<g
						stroke="url(#wire)"
						strokeWidth="1.5"
						fill="none"
						opacity="0.7"
						strokeLinecap="round"
					>
						<path d="M 12% 16% C 26% 16%, 26% 14%, 48% 14%" />
						<path d="M 16% 18% C 18% 34%, 16% 40%, 20% 50%" />
						<path d="M 52% 16% C 58% 36%, 54% 44%, 52% 52%" />
						<path d="M 22% 52% C 40% 52%, 44% 54%, 50% 54%" />
						<path d="M 54% 56% C 66% 60%, 70% 68%, 76% 74%" />
					</g>
				</svg>
			</div>
		</div>
	);
}

function Node({
	style,
	label,
	tone,
}: {
	style: React.CSSProperties;
	label: string;
	tone: "io" | "param";
}) {
	return (
		<div
			style={style}
			className="absolute flex items-center gap-1.5 rounded-md border border-white/10 bg-[oklch(0.18_0.01_270)] px-2 py-1 shadow-lg"
		>
			<span
				className={`h-1.5 w-1.5 rounded-full ${tone === "param" ? "bg-violet-400" : "bg-sky-400"}`}
			/>
			<span className="font-mono text-[10px] text-neutral-300 md:text-xs">
				{label}
			</span>
		</div>
	);
}

function SocialProof() {
	return (
		<Container className="py-4">
			<Reveal>
				<div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015] md:grid-cols-4 md:divide-y-0">
					{stats.map((s) => (
						<div
							key={s.label}
							className="flex flex-col items-center gap-1 px-4 py-6 text-center"
						>
							<div className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl">
								{s.value}
							</div>
							<div className="text-xs text-neutral-500 md:text-sm">
								{s.label}
							</div>
						</div>
					))}
				</div>
			</Reveal>
		</Container>
	);
}

function SectionHeader({
	eyebrow,
	title,
	subtitle,
}: {
	eyebrow: string;
	title: string;
	subtitle?: string;
}) {
	return (
		<div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
			<Reveal>
				<span className="font-mono text-xs tracking-[0.2em] text-indigo-300/80 uppercase">
					{eyebrow}
				</span>
			</Reveal>
			<Reveal delay={0.06}>
				<h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl 2xl:text-5xl">
					{title}
				</h2>
			</Reveal>
			{subtitle ? (
				<Reveal delay={0.12}>
					<p className="text-base text-balance text-neutral-400 md:text-lg">
						{subtitle}
					</p>
				</Reveal>
			) : null}
		</div>
	);
}

function UseCases() {
	return (
		<Container className="flex flex-col gap-12 py-20 md:py-28">
			<SectionHeader
				eyebrow="// use cases"
				title="Built for the way Grasshopper actually gets reviewed."
				subtitle="From a quick gut-check to a full version hand-off, Hopper Clip meets your reviewers where they are."
			/>
			<div className="grid grid-cols-1 gap-4 min-[2200px]:gap-6 md:grid-cols-3 md:gap-5">
				{cases.map((c, i) => (
					<Reveal key={c.eyebrow} delay={i * 0.08}>
						<CaseCard {...c} />
					</Reveal>
				))}
			</div>
		</Container>
	);
}

function CaseCard({
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
		<div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] min-[2200px]:p-10 2xl:p-9">
			<div className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.18),transparent_70%)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
			<div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-indigo-300">
				<Icon className="h-5 w-5" />
			</div>
			<div className="font-mono text-xs tracking-[0.18em] text-neutral-500 uppercase">
				{eyebrow}
			</div>
			<h3 className="text-xl leading-snug font-semibold tracking-tight">
				{title}
			</h3>
			<p className="text-sm leading-relaxed text-neutral-400 min-[2200px]:text-base">
				{body}
			</p>
		</div>
	);
}

function FeatureGrid() {
	return (
		<Container className="flex flex-col gap-12 py-20 md:py-28">
			<SectionHeader
				eyebrow="// features"
				title="Everything you need to treat definitions like real code."
				subtitle="A snippet manager built around how Grasshopper graphs actually look — visual, structured, and diffable."
			/>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((f, i) => (
					<Reveal key={f.title} delay={(i % 3) * 0.06}>
						<FeatureCard {...f} />
					</Reveal>
				))}
			</div>
		</Container>
	);
}

function FeatureCard({
	icon: Icon,
	title,
	body,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	body: string;
}) {
	return (
		<div className="group h-full rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.035] min-[2200px]:p-8 2xl:p-7">
			<Icon className="mb-4 h-5 w-5 text-neutral-300 transition-colors group-hover:text-indigo-300" />
			<h3 className="text-base font-semibold tracking-tight">{title}</h3>
			<p className="mt-2 text-sm leading-relaxed text-neutral-400">{body}</p>
		</div>
	);
}

function DuckerWebBanner() {
	return (
		<Container className="py-20 md:py-28">
			<Reveal>
				<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 min-[2200px]:p-16 md:p-12">
					<div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.68_0.2_330/0.22),transparent_70%)] blur-2xl" />
					<div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.7_0.16_220/0.18),transparent_70%)] blur-2xl" />
					<div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
						<div className="max-w-xl">
							<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-300">
								<Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
								also from hopper clip
							</div>
							<h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl 2xl:text-5xl">
								Look at a definition without opening Rhino.
							</h2>
							<p className="mt-4 text-base leading-relaxed text-neutral-400 md:text-lg">
								<span className="font-medium text-neutral-200">DuckerWeb</span>{" "}
								is our free, browser-only viewer. Drop a{" "}
								<code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-neutral-200">
									.gh
								</code>
								, paste GhXml, or compare two versions side-by-side — everything
								runs locally in your browser, nothing uploaded, no account
								required.
							</p>
							<div className="mt-5 flex flex-wrap gap-2">
								<Pill>No Rhino</Pill>
								<Pill>No Grasshopper</Pill>
								<Pill>No sign-up</Pill>
								<Pill>Runs locally</Pill>
							</div>
						</div>
						<div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
							<Link
								to="/duckerweb"
								className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200 md:text-base"
							>
								Open DuckerWeb
								<ArrowRight className="h-4 w-4" />
							</Link>
							<span className="text-xs text-neutral-500">
								free · no account needed
							</span>
						</div>
					</div>
				</div>
			</Reveal>
		</Container>
	);
}

function Pill({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-neutral-300">
			{children}
		</span>
	);
}

function FaqSection() {
	return (
		<Container className="flex flex-col gap-12 py-20 md:py-28">
			<SectionHeader
				eyebrow="// faq"
				title="Questions, answered."
				subtitle="Still curious? Drop a file into DuckerWeb and try it with zero commitment."
			/>
			<div className="mx-auto w-full max-w-3xl divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015]">
				{faqs.map((f, i) => (
					<Reveal key={f.q} delay={Math.min(i, 4) * 0.04}>
						<FaqItem {...f} defaultOpen={i === 0} />
					</Reveal>
				))}
			</div>
		</Container>
	);
}

function FaqItem({
	q,
	a,
	defaultOpen,
}: {
	q: string;
	a: string;
	defaultOpen?: boolean;
}) {
	const [open, setOpen] = useState(!!defaultOpen);
	return (
		<div className="px-5 md:px-7">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-4 py-5 text-left"
			>
				<span className="text-base font-medium text-neutral-100 md:text-lg">
					{q}
				</span>
				<span
					className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 text-neutral-400 transition-transform duration-300 ${open ? "rotate-45" : ""}`}
				>
					<svg
						viewBox="0 0 24 24"
						className="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<path d="M12 5v14M5 12h14" />
					</svg>
				</span>
			</button>
			<div
				className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
			>
				<div className="overflow-hidden">
					<p className="max-w-prose text-sm leading-relaxed text-neutral-400 md:text-base">
						{a}
					</p>
				</div>
			</div>
		</div>
	);
}

function FinalCta() {
	return (
		<Container className="py-20 md:py-28">
			<Reveal>
				<div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center md:px-12 md:py-20">
					<div className="bg-grid mask-radial-fade absolute inset-0 opacity-50" />
					<div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.19_277/0.28),transparent_70%)] blur-2xl" />
					<div className="relative flex flex-col items-center gap-5">
						<h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-5xl 2xl:text-6xl">
							Stop sending .gh files. Start sending links.
						</h2>
						<p className="max-w-xl text-base text-balance text-neutral-400 md:text-lg">
							Create your free account and build a library of Grasshopper
							definitions you can actually share, review, and diff.
						</p>
						<SignUpButton mode="modal">
							<button
								type="button"
								className="group mt-2 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-[0_0_40px_-8px_oklch(0.62_0.19_277/0.6)] transition-all hover:bg-neutral-200 md:text-base"
							>
								Get started — it's free
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
							</button>
						</SignUpButton>
					</div>
				</div>
			</Reveal>
		</Container>
	);
}
