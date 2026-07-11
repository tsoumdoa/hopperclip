import { SignedIn, SignedOut } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";

export function DuckerwebHeader() {
	return (
		<header className="mb-8 flex w-full items-center justify-between">
			<div>
				<SignedIn>
					<Link className="text-2xl font-bold md:text-4xl" to="/ghcards">
						Hopper Clip
					</Link>
				</SignedIn>
				<SignedOut>
					<Link className="text-2xl font-bold md:text-4xl" to="/">
						Hopper Clip
					</Link>
				</SignedOut>
				<h1 className="mt-2 text-xl font-semibold text-neutral-300">
					DuckerWeb
				</h1>
			</div>
			<div className="flex items-center gap-3">
				<SignedIn>
					<Link
						to="/ghcards"
						className="rounded-full border border-white px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-800"
					>
						My Cards
					</Link>
				</SignedIn>
				<a
					href="https://github.com/mcneel/ducker"
					target="_blank"
					rel="noopener noreferrer"
					className="rounded-full border border-white px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-800"
				>
					GitHub
				</a>
			</div>
		</header>
	);
}
