import { LogoMark } from "./logo";

export function AuthLoadingScreen() {
	return (
		<div
			className="bg-background flex min-h-screen items-center justify-center"
			role="status"
			aria-label="Loading"
		>
			<LogoMark className="size-9 animate-pulse rounded-[8px]" />
		</div>
	);
}
