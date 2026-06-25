import { Link } from "@tanstack/react-router";

export function DuckerwebHeader() {
	return (
		<header className="mb-8 flex w-full items-center justify-between">
			<div>
				<Link className="text-2xl font-bold md:text-4xl" to="/">
					Hopper Clip
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-neutral-300">
					DuckerWeb
				</h1>
			</div>
			<a
				href="https://github.com/mcneel/ducker"
				target="_blank"
				rel="noopener noreferrer"
				className="rounded-full border border-white px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-800"
			>
				GitHub Repo
			</a>
		</header>
	);
}
