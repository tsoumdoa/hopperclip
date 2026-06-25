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
		<header className="flex w-full items-center justify-between pb-8">
			<Link className="text-2xl font-bold md:text-4xl" to="/">
				Hopper Clip
			</Link>
			<div className="flex items-center gap-3">
				<SignedOut>
					<SignInButton>
						<button className="flex h-8 w-20 items-center justify-center rounded-full border-2 border-white bg-black font-semibold transition-all hover:bg-neutral-400">
							Sign in
						</button>
					</SignInButton>

					<SignUpButton>
						<button className="flex h-8 w-20 items-center justify-center rounded-full border-2 border-white bg-black font-semibold transition-all hover:bg-neutral-400">
							Sign up
						</button>
					</SignUpButton>
				</SignedOut>
				<SignedIn>
					<UserButton />
				</SignedIn>
			</div>
		</header>
	);
}
