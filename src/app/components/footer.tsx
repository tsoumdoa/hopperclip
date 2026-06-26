import { Link } from "@tanstack/react-router";
import { SiRefinedgithub } from "@icons-pack/react-simple-icons";

export default function Footer() {
	return (
		<footer className="mt-auto h-fit w-full pt-4 md:h-5 md:pt-0">
			<div className="flex flex-col items-center justify-between gap-y-2 sm:flex-row">
				<nav className="flex items-center gap-x-2">
					<Link
						to="/privacy"
						className="text-xs text-neutral-600 hover:text-neutral-700"
					>
						Privacy Policy
					</Link>
					<Link
						to="/terms-of-service"
						className="text-xs text-neutral-600 hover:text-neutral-700"
					>
						Term of Service
					</Link>
				</nav>
				<div className="flex items-center gap-x-2">
					<div className="text-xs text-neutral-600">
						© {new Date().getFullYear()} HopperClip. All rights reserved.
					</div>
					<a
						href="https://github.com/tsoumdoa/better-gh-lib"
						className="text-xs text-neutral-600"
						aria-label="HopperClip on GitHub"
					>
						<SiRefinedgithub color="#737373" size={16} aria-hidden />
					</a>
				</div>
			</div>
		</footer>
	);
}
