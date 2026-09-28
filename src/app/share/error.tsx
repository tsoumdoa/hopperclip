import { Loader2 } from "lucide-react";
import { PageShell } from "@/app/components/page-shell";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export default function ShareError() {
	const navigate = useNavigate();

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate({ to: "/" });
		}, 800);
		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<PageShell footer={false}>
			<div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400">
				<Loader2 className="size-4 animate-spin" aria-hidden />
				This share link isn't valid. Redirecting…
			</div>
		</PageShell>
	);
}
