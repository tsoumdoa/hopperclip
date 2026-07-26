import Header from "@/app/components/header";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export default function ShareError({
	error,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const navigate = useNavigate();

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate({ to: "/" });
		}, 800);
		return () => clearTimeout(timer);
	}, [error, navigate]);

	return (
		<div className="flex min-h-screen flex-col bg-black p-4 font-sans text-white md:p-6">
			<Header />
			<div className="flex h-full w-full flex-grow flex-col items-center justify-center p-4 pb-[72px]">
				Something went wrong! Redirecting...
			</div>
		</div>
	);
}
