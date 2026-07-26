import { SignUpButton, useAuth } from "@clerk/tanstack-react-start";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowRight,
	GitCompareArrows,
	MessageSquare,
	MousePointerClick,
	Plug,
} from "lucide-react";
import { useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { AuthLoadingScreen } from "@/features/landing/auth-loading-screen";
import Footer from "@/features/landing/footer";
import Header from "@/components/header";
import { Reveal } from "@/features/landing/reveal";
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
		<div className="min-h-screen bg-black font-sans text-white">
			<div className="mx-auto flex min-h-screen max-w-400 flex-col p-4 min-[2200px]:px-16 md:px-6 md:pt-6 md:pb-2 2xl:px-10 2xl:pt-8">
				<Header />
				{isSignedIn ? <SignedInLandingContent /> : <LandingPageContent />}
				<Footer />
			</div>
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

function LandingPageContent() {
	return (
		<>
			<div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 min-[2200px]:max-w-[140rem] min-[2200px]:gap-20 2xl:max-w-[100rem] 2xl:gap-14">
				<div className="min-[2200px]:grid-cols-[minmax(0,1fr)_32rem] xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_28rem] 2xl:gap-16">
					<section className="flex w-full flex-col gap-5 pt-6 pb-4 min-[2200px]:pt-28 min-[2200px]:pb-20 md:pt-10 md:pb-6 2xl:gap-7 2xl:pt-20 2xl:pb-16">
						<Reveal>
							<span className="font-mono text-xs tracking-[0.2em] text-neutral-600 uppercase 2xl:text-sm">
								for individuals &amp; teams
							</span>
						</Reveal>
						<Reveal delay={0.05}>
							<div>
								<h1 className="max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tight min-[2200px]:text-8xl md:text-6xl 2xl:max-w-3xl 2xl:text-7xl">
									Grasshopper, reviewed.
								</h1>
								<p className="mt-3 max-w-xl text-base text-neutral-400 min-[2200px]:text-2xl md:text-lg 2xl:mt-5 2xl:max-w-2xl 2xl:text-xl">
									Organize your own Grasshopper definitions. Share them with a
									team to inspect, compare, and review across versions — without
									anyone needing Rhino in front of them.
								</p>
							</div>
						</Reveal>
						<Reveal delay={0.1}>
							<div className="flex flex-wrap items-center gap-3 pt-1 2xl:gap-4">
								<SignUpButton mode="modal">
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200 2xl:px-7 2xl:py-3.5 2xl:text-base"
									>
										Get started
										<ArrowRight className="h-4 w-4" />
									</button>
								</SignUpButton>
							</div>
							<p className="mt-3 flex items-center gap-2 text-base text-neutral-400 2xl:text-lg">
								<Plug className="h-4 w-4 shrink-0" />
								Nothing to install — no Rhino, no plugins, no setup for whoever
								opens the link.
							</p>
						</Reveal>
					</section>

					<div className="hidden pt-6 pb-4 min-[2200px]:pt-28 min-[2200px]:pb-20 md:pt-10 md:pb-6 xl:block 2xl:pt-20 2xl:pb-16">
						<Reveal delay={0.12}>
							<DuckerWebCard variant="aside" />
						</Reveal>
					</div>
				</div>

				<section className="grid w-full grid-cols-1 gap-4 py-2 min-[2200px]:gap-10 md:grid-cols-3 2xl:gap-8 2xl:py-2">
					{cases.map((c, i) => (
						<Reveal key={c.eyebrow} delay={i * 0.08}>
							<CaseCard {...c} />
						</Reveal>
					))}
				</section>

				<div className="xl:hidden">
					<DuckerWebSection />
				</div>
			</div>
			<BottomFade />
		</>
	);
}

function BottomFade() {
	const { scrollYProgress } = useScroll();
	const opacity = useTransform(scrollYProgress, [0, 0.75, 0.95], [1, 1, 0]);
	return (
		<motion.div
			style={{ opacity }}
			aria-hidden
			className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-24 bg-gradient-to-b from-transparent to-black"
		/>
	);
}

function DuckerWebSection() {
	return (
		<section className="mt-10 w-full pb-4 md:mt-12 2xl:mt-16">
			<Reveal>
				<DuckerWebCard variant="banner" />
			</Reveal>
		</section>
	);
}

function DuckerWebCard({ variant }: { variant: "aside" | "banner" }) {
	if (variant === "aside") {
		return (
			<div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-950 to-black p-6 2xl:p-10">
				<div className="font-mono text-xs tracking-[0.2em] text-neutral-500 uppercase 2xl:text-sm">
					// also from hopper clip
				</div>
				<h2 className="mt-3 text-lg leading-snug font-semibold tracking-tight 2xl:text-xl">
					Look at a definition without opening Rhino.
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-neutral-400 2xl:text-base">
					<span className="font-medium text-neutral-200">DuckerWeb</span> is our
					free browser viewer — drop a{" "}
					<code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-xs text-neutral-300">
						.gh
					</code>
					, no account needed.
				</p>
				<Link
					to="/duckerweb"
					className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
				>
					Open DuckerWeb
					<ArrowRight className="h-4 w-4" />
				</Link>
				<p className="mt-2 text-center text-xs text-neutral-500">
					free · runs locally in your browser
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-950 to-black">
			<div className="flex flex-col gap-5 p-6 min-[2200px]:p-16 md:flex-row md:items-center md:justify-between md:p-8 2xl:gap-10 2xl:p-14">
				<div className="max-w-xl">
					<div className="font-mono text-xs tracking-[0.2em] text-neutral-500 uppercase 2xl:text-sm">
						// also from hopper clip
					</div>
					<h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl 2xl:text-4xl">
						Look at a definition without opening Rhino.
					</h2>
					<p className="mt-3 text-sm leading-relaxed text-neutral-400 md:text-base 2xl:text-lg">
						<span className="font-medium text-neutral-200">DuckerWeb</span> is
						our free, browser-only viewer. Drop a{" "}
						<code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-xs text-neutral-300">
							.gh
						</code>
						, paste GhXml, or compare two versions side-by-side — everything
						runs locally in your browser, nothing uploaded, no account required.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<Pill>No Rhino</Pill>
						<Pill>No Grasshopper</Pill>
						<Pill>No sign-up</Pill>
						<Pill>Runs locally</Pill>
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
					<Link
						to="/duckerweb"
						className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200 2xl:px-7 2xl:py-3.5 2xl:text-base"
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
	);
}

function Pill({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-400">
			{children}
		</span>
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
		<div className="flex h-full flex-col gap-3 rounded-xl border border-neutral-900 bg-neutral-950 p-6 transition-colors hover:border-neutral-700 min-[2200px]:gap-7 min-[2200px]:p-12 2xl:gap-6 2xl:p-10">
			<Icon className="h-5 w-5 text-neutral-400 min-[2200px]:h-8 min-[2200px]:w-8 2xl:h-7 2xl:w-7" />
			<div className="font-mono text-xs tracking-[0.18em] text-neutral-500 uppercase">
				{eyebrow}
			</div>
			<h3 className="text-lg leading-snug font-semibold 2xl:text-xl">
				{title}
			</h3>
			<p className="text-sm text-neutral-400 2xl:text-base">{body}</p>
		</div>
	);
}
