import { Link } from "@tanstack/react-router";
import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { cn } from "@/lib/utils";

const VARIANTS = [
	{ path: "/lp1", label: "1", title: "Diff Theater" },
	{ path: "/lp2", label: "2", title: "Paste Lab" },
	{ path: "/lp3", label: "3", title: "Expression Lab" },
	{ path: "/lp4", label: "4", title: "Split Story" },
	{ path: "/lp5", label: "5", title: "Product Tour" },
] as const;

export type LandingVariantId = (typeof VARIANTS)[number]["path"] | "/lp";

export function LandingShell({
	active,
	children,
	className,
}: {
	active: LandingVariantId;
	children: React.ReactNode;
	className?: string;
}) {
	const current =
		active === "/lp"
			? { title: "Gallery" }
			: VARIANTS.find((v) => v.path === active);

	return (
		<div className={cn("min-h-screen bg-black font-sans text-white", className)}>
			<div className="mx-auto flex min-h-screen max-w-400 flex-col p-4 md:px-6 md:pt-6 md:pb-2">
				<Header />
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
					<div className="flex flex-col gap-0.5">
						<p className="text-[11px] tracking-[0.18em] text-neutral-500 uppercase">
							Landing review
						</p>
						<p className="text-sm text-neutral-300">
							{current?.title ?? "Variant"}{" "}
							<span className="text-neutral-600">· pick a version</span>
						</p>
					</div>
					<nav className="flex items-center gap-1.5" aria-label="Landing variants">
						<Link
							to="/lp"
							className={cn(
								"rounded-md px-2 py-1 text-xs transition-colors",
								active === "/lp"
									? "bg-white text-black"
									: "text-neutral-500 hover:bg-neutral-900 hover:text-white"
							)}
						>
							All
						</Link>
						{VARIANTS.map((variant) => (
							<Link
								key={variant.path}
								to={variant.path}
								className={cn(
									"rounded-md px-2.5 py-1 font-mono text-xs transition-colors",
									active === variant.path
										? "bg-white text-black"
										: "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
								)}
								title={variant.title}
							>
								{variant.label}
							</Link>
						))}
					</nav>
				</div>
				<main className="flex-1">{children}</main>
				<Footer />
			</div>
		</div>
	);
}

export { VARIANTS as LANDING_VARIANTS };
