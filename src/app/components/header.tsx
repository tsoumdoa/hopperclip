import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="flex w-full items-center justify-between pb-3">
			<Link className="text-2xl font-bold md:text-4xl" to="/">
				Hopper Clip
			</Link>
			<div className="flex items-center gap-3">
				<SignedOut>
					<SignInButton>
						<button
							type="button"
							className="px-1 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
						>
							Sign in
						</button>
					</SignInButton>

					<SignUpButton>
						<button
							type="button"
							className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
						>
							Sign up
						</button>
					</SignUpButton>
				</SignedOut>
				<SignedIn>
					<Link
						to="/ghcards"
						className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
					>
						My Cards
					</Link>
					<Link
						to="/duckerweb"
						className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
					>
						DuckerWeb
					</Link>
					<UserButton
						userProfileMode="navigation"
						userProfileUrl="/user-profile"
					/>
				</SignedIn>
			</div>
		</header>
	);
}
