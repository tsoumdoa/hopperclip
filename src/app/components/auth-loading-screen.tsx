import { LoadingSpinner } from "@/app/ghcards/components/loading-spinner";

export function AuthLoadingScreen() {
	return (
		<div className="flex min-h-screen animate-in fade-in flex-col items-center justify-center bg-black font-sans text-white duration-300">
			<h1 className="mb-6 text-2xl font-bold md:text-4xl">Hopper Clip</h1>
			<LoadingSpinner variant="regular" />
		</div>
	);
}
