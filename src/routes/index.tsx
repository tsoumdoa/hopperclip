import { SignUpButton, useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [{ title: "Hopper Clip — Grasshopper script pastebin" }],
	}),
	component: Home,
});

function Home() {
	const { isSignedIn, isLoaded } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			navigate({ to: "/ghcards", replace: true });
		}
	}, [isLoaded, isSignedIn, navigate]);

	return (
		<div className="min-h-screen bg-black font-sans text-white">
			<div className="mx-auto flex min-h-screen max-w-400 flex-col p-4 md:px-6 md:pt-6 md:pb-2">
				<Header />
				<LandingPageContent />
				<Footer />
			</div>
		</div>
	);
}

function LandingPageContent() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center py-12 md:py-20">
			<div className="flex flex-col items-center gap-8 text-center">
				<h1 className="text-4xl font-bold md:text-6xl">
					Share a Grasshopper definition in one click.
				</h1>
				<p className="text-lg text-neutral-400 md:text-xl">
					Drop a{" "}
					<code className="rounded bg-neutral-800 px-1.5 py-0.5 text-sm">
						.gh
					</code>{" "}
					file, paste the XML, or grab a shareable link — no file attachments,
					no zip-and-upload, no fuss.
				</p>
				<SignUpButton mode="modal">
					<button className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200 md:text-base">
						<span className="flex items-center gap-2">
							Get Started Free
							<ArrowRight className="h-4 w-4" />
						</span>
					</button>
				</SignUpButton>
				<div className="grid w-full grid-cols-1 gap-6 pt-8 md:grid-cols-3">
					<FeatureCard
						title="Drop or paste"
						description="Import a .gh or .ghx file when adding a definition, or paste the GhXml directly. Either way, you get a clean shareable link."
					/>
					<FeatureCard
						title="Share with a link"
						description="Send a short URL. Recipients can inspect the definition in their browser and copy its GhXml."
					/>
					<FeatureCard
						title="Stay organized"
						description="Tag, search, and find every definition you've saved — from one-panel tricks to full design systems."
					/>
				</div>

				<div className="mt-12 flex w-full items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-6 py-4">
					<div className="text-left">
						<h2 className="text-lg font-semibold">Also try DuckerWeb</h2>
						<p className="text-sm text-neutral-400">
							Auto-generate plugin reference docs from a GhXml.
						</p>
					</div>
					<Link
						to="/duckerweb"
						className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
					>
						Open
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>
			</div>
		</div>
	);
}

function FeatureCard(props: { title: string; description: string }) {
	return (
		<div className="flex flex-col rounded-md bg-neutral-900 p-6 ring-1 ring-neutral-500">
			<h2 className="pb-2 text-xl font-bold">{props.title}</h2>
			<p className="text-neutral-400">{props.description}</p>
		</div>
	);
}
