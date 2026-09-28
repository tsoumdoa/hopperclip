import { Link } from "@tanstack/react-router";
import { SiRefinedgithub } from "@icons-pack/react-simple-icons";

const footerLinkClass =
	"text-xs text-neutral-500 transition-colors hover:text-neutral-200";

export default function Footer() {
	return (
		<footer className="mt-16 w-full border-t border-white/[0.06] py-6">
			<div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
				<nav className="flex items-center gap-x-4">
					<Link to="/duckerweb" className={footerLinkClass}>
						DuckerWeb
					</Link>
					<Link to="/privacy" className={footerLinkClass}>
						Privacy
					</Link>
					<Link to="/terms-of-service" className={footerLinkClass}>
						Terms
					</Link>
				</nav>
				<div className="flex items-center gap-x-3">
					<span className="text-xs text-neutral-600">
						© {new Date().getFullYear()} Hopper Clip
					</span>
					<a
						href="https://github.com/tsoumdoa/hopperclip"
						target="_blank"
						rel="noopener noreferrer"
						className="text-neutral-500 transition-colors hover:text-neutral-200"
						aria-label="Hopper Clip on GitHub"
					>
						<SiRefinedgithub size={16} color="currentColor" aria-hidden />
					</a>
				</div>
			</div>
		</footer>
	);
}
