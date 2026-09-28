import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { LogoMark } from "./logo";

const navLinkClass =
	"rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white";
const navLinkActiveClass = "bg-white/[0.07] text-white";

export default function Header() {
	return (
		<header className="bg-background/80 sticky top-0 z-40 flex h-14 w-full items-center justify-between backdrop-blur-md">
			<Link
				to="/"
				className="group flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight md:text-xl"
			>
				<LogoMark />
				Hopper Clip
			</Link>
			<nav className="flex items-center gap-1 sm:gap-2">
				<SignedOut>
					<Link
						to="/duckerweb"
						className={`${navLinkClass} hidden sm:inline-flex`}
						activeProps={{ className: navLinkActiveClass }}
					>
						DuckerWeb
					</Link>
					<SignInButton mode="modal">
						<button type="button" className={navLinkClass}>
							Sign in
						</button>
					</SignInButton>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="ml-1 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
						>
							Sign up
						</button>
					</SignUpButton>
				</SignedOut>
				<SignedIn>
					<Link
						to="/ghcards"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						Library
					</Link>
					<Link
						to="/duckerweb"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						DuckerWeb
					</Link>
					<div className="ml-2 flex items-center">
						<UserButton
							userProfileMode="navigation"
							userProfileUrl="/user-profile"
						/>
					</div>
				</SignedIn>
			</nav>
		</header>
	);
}
