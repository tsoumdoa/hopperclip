import { SignUpButton, useAuth } from "@clerk/tanstack-react-start";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { AuthLoadingScreen } from "@/app/components/auth-loading-screen";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { ClipLibraryDemo } from "@/app/components/landing/clip-library-demo";
import { InspectDiffVisual } from "@/app/components/landing/inspect-diff-visual";
import { Reveal } from "@/app/components/landing/reveal";
import { fetchClerkAuth } from "./__root";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [{ title: "Hopper Clip — Grasshopper snippets, ready" }],
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

function LandingPageContent() {
	return (
		<>
			<div className="mx-auto flex w-full max-w-6xl flex-1 flex-col min-[2200px]:max-w-[140rem] 2xl:max-w-[100rem]">
				<Hero />
				<PersonalBeat />
				<ShareBeat />
				<InspectBeat />
				<Closing />
			</div>
			<BottomFade />
		</>
	);
}

function Hero() {
	return (
		<section className="grid w-full grid-cols-1 items-end gap-8 pt-8 pb-12 md:pt-12 md:pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12 xl:gap-14 2xl:pt-16 2xl:pb-20">
			<div className="flex flex-col gap-4">
				<Reveal>
					<h1 className="text-5xl leading-[0.95] font-semibold tracking-tight md:text-7xl 2xl:text-8xl">
						Hopper{" "}
						<span className="text-green-300">Clip</span>
					</h1>
				</Reveal>
				<Reveal delay={0.05}>
					<p className="max-w-xl text-xl leading-snug font-medium text-neutral-200 md:text-2xl 2xl:text-3xl">
						Your Grasshopper snippets, ready when you need them.
					</p>
				</Reveal>
				<Reveal delay={0.1}>
					<p className="max-w-lg text-base text-neutral-400 md:text-lg">
						Keep the definitions you paste over and over. Find them in seconds —
						then share or inspect without hunting folders.
					</p>
				</Reveal>
				<Reveal delay={0.15}>
					<div className="pt-1">
						<SignUpButton mode="modal">
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-full bg-green-300 px-6 py-3 text-sm font-semibold text-neutral-800 transition-all hover:bg-green-200 2xl:px-7 2xl:py-3.5 2xl:text-base"
							>
								Get started
								<ArrowRight className="h-4 w-4" />
							</button>
						</SignUpButton>
					</div>
				</Reveal>
			</div>

			<Reveal delay={0.12}>
				<div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5 2xl:p-7">
					<p className="mb-4 font-mono text-[10px] tracking-[0.18em] text-green-300/70 uppercase">
						your library
					</p>
					<ClipLibraryDemo mode="preview" />
				</div>
			</Reveal>
		</section>
	);
}

function PersonalBeat() {
	return (
		<section className="border-t border-neutral-900 py-12 md:py-16">
			<div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10">
				<Reveal>
					<div className="max-w-md">
						<p className="font-mono text-xs tracking-[0.2em] text-green-300/80 uppercase">
							For you first
						</p>
						<h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl 2xl:text-4xl">
							A personal clip library for the scripts you reuse.
						</h2>
						<p className="mt-3 text-sm leading-relaxed text-neutral-400 md:text-base">
							Paste or drop a definition, tag it, find it later. One click copies
							it back into Grasshopper — no digging through project folders.
						</p>
					</div>
				</Reveal>
				<Reveal delay={0.08}>
					<div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5 md:p-6">
						<p className="mb-4 font-mono text-[10px] tracking-[0.18em] text-green-300/70 uppercase">
							try copy
						</p>
						<ClipLibraryDemo mode="copy" featuredId="curve" />
					</div>
				</Reveal>
			</div>
		</section>
	);
}

function ShareBeat() {
	return (
		<section className="border-t border-neutral-900 py-12 md:py-16">
			<div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10">
				<Reveal className="order-2 md:order-1">
					<div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5 pb-14 md:p-6 md:pb-14">
						<p className="mb-4 font-mono text-[10px] tracking-[0.18em] text-green-300/70 uppercase">
							try share
						</p>
						<ClipLibraryDemo mode="share" featuredId="facade" />
					</div>
				</Reveal>
				<Reveal delay={0.08} className="order-1 md:order-2">
					<div className="max-w-md md:ml-auto">
						<p className="font-mono text-xs tracking-[0.2em] text-green-300/80 uppercase">
							Then the team
						</p>
						<h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl 2xl:text-4xl">
							Share a link. Skip the file ritual.
						</h2>
						<p className="mt-3 text-sm leading-relaxed text-neutral-400 md:text-base">
							No export, attach, download, open. Hit share, send the URL — your
							teammate opens it in a browser.
						</p>
					</div>
				</Reveal>
			</div>
		</section>
	);
}

function InspectBeat() {
	return (
		<section className="border-t border-neutral-900 py-12 md:py-16">
			<div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-10">
				<Reveal>
					<div className="max-w-md">
						<p className="font-mono text-xs tracking-[0.2em] text-green-300/80 uppercase">
							See without Rhino
						</p>
						<h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl 2xl:text-4xl">
							Inspect the graph. Diff what changed.
						</h2>
						<p className="mt-3 text-sm leading-relaxed text-neutral-400 md:text-base">
							<span className="font-medium text-neutral-200">DuckerWeb</span>{" "}
							reads the graph in your browser — pan, zoom, or diff two versions.
							Built into Hopper Clip; free on its own.
						</p>
						<Link
							to="/duckerweb"
							className="mt-4 inline-flex items-center gap-1.5 text-sm text-green-300 underline-offset-4 hover:text-green-200 hover:underline"
						>
							Open DuckerWeb
							<ArrowRight className="h-3.5 w-3.5" />
						</Link>
					</div>
				</Reveal>
				<Reveal delay={0.08}>
					<InspectDiffVisual />
				</Reveal>
			</div>
		</section>
	);
}

function Closing() {
	return (
		<section className="border-t border-neutral-900 py-12 md:py-16">
			<Reveal>
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
						Keep. Share.{" "}
						<span className="text-green-300">See.</span>
					</h2>
					<p className="mt-3 text-base text-neutral-400 md:text-lg">
						Your snippets stay organized. Your team gets a link. Anyone can read
						the script without opening Grasshopper.
					</p>
					<div className="mt-6 flex flex-col items-center gap-3">
						<SignUpButton mode="modal">
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-full bg-green-300 px-7 py-3.5 text-sm font-semibold text-neutral-800 transition-all hover:bg-green-200 md:text-base"
							>
								Get started
								<ArrowRight className="h-4 w-4" />
							</button>
						</SignUpButton>
						<p className="text-sm text-neutral-500">
							Just need a quick look?{" "}
							<Link
								to="/duckerweb"
								className="text-green-300 underline-offset-4 hover:text-green-200 hover:underline"
							>
								Open DuckerWeb
							</Link>
							<span className="text-neutral-600">
								{" "}
								— free viewer, no account.
							</span>
						</p>
					</div>
				</div>
			</Reveal>
		</section>
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
