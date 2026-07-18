import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PrimarySignUp, SecondaryDuckerLink, ProductContrast } from "../ctas";

type ExprNode = {
	id: string;
	label: string;
	x: number;
	y: number;
	kind: "component" | "value";
	expression?: string;
};

const NODES: ExprNode[] = [
	{
		id: "n1",
		label: "Number",
		x: 18,
		y: 35,
		kind: "value",
		expression: "x * 2 + 1",
	},
	{
		id: "n2",
		label: "Expression",
		x: 48,
		y: 50,
		kind: "component",
		expression: "Sin(t) * Radius",
	},
	{
		id: "n3",
		label: "Move",
		x: 78,
		y: 35,
		kind: "component",
		expression: "UnitZ * Height",
	},
];

export function Lp3ExpressionLab() {
	const [hovered, setHovered] = useState<string | null>(null);
	const [pinned, setPinned] = useState<string | null>(null);
	const stageRef = useRef<HTMLDivElement>(null);

	const activeId = pinned ?? hovered;
	const active = NODES.find((n) => n.id === activeId);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setPinned(null);
		};
		const onPointer = (event: MouseEvent) => {
			if (!stageRef.current?.contains(event.target as Node)) {
				setPinned(null);
			}
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("mousedown", onPointer);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("mousedown", onPointer);
		};
	}, []);

	return (
		<div className="pb-16">
			<section className="grid min-h-[68vh] items-center gap-10 pt-6 lg:grid-cols-2">
				<div>
					<p className="text-5xl font-bold tracking-tight md:text-6xl">
						Hopper Clip
					</p>
					<h1 className="mt-4 text-2xl font-semibold md:text-3xl">
						Save Grasshopper scripts online — inspect what&apos;s inside
						locally.
					</h1>
					<p className="mt-4 max-w-md text-neutral-400 md:text-lg">
						Hopper Clip is your pastebin: account, tags, shareable links.
						DuckerWeb is the local-first companion that opens .gh files in the
						browser so you can read graphs and expressions without uploading.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<PrimarySignUp />
						<SecondaryDuckerLink label="Inspect locally" />
					</div>
					<p className="mt-6 text-xs text-neutral-600">
						Try the inspector: hover a{" "}
						<span className="rounded bg-neutral-800 px-1 font-mono text-neutral-300">
							*
						</span>{" "}
						badge, click to pin.
					</p>
				</div>

				<div
					ref={stageRef}
					className="relative aspect-square max-h-[420px] w-full overflow-visible rounded-2xl border border-neutral-700 md:aspect-[5/4]"
					style={{ backgroundColor: "#ccc9c0" }}
				>
					<p className="absolute top-3 left-3 z-10 rounded bg-black/60 px-2 py-1 text-[10px] tracking-wide text-neutral-300 uppercase">
						DuckerWeb · local canvas
					</p>
					<div
						aria-hidden
						className="absolute inset-0 rounded-2xl"
						style={{
							backgroundImage:
								"linear-gradient(#bbb8af 1px, transparent 1px), linear-gradient(90deg, #bbb8af 1px, transparent 1px)",
							backgroundSize: "28px 28px",
						}}
					/>

					<svg className="absolute inset-0 h-full w-full" aria-hidden>
						<path
							d="M 22% 38% C 34% 38%, 34% 52%, 46% 52%"
							fill="none"
							stroke="#5a5a5a"
							strokeWidth="2"
						/>
						<path
							d="M 56% 52% C 66% 52%, 66% 38%, 76% 38%"
							fill="none"
							stroke="#5a5a5a"
							strokeWidth="2"
						/>
					</svg>

					{NODES.map((node) => {
						const showBadge = Boolean(node.expression);
						const isLive = activeId === node.id;
						return (
							<div
								key={node.id}
								className="absolute -translate-x-1/2 -translate-y-1/2"
								style={{ left: `${node.x}%`, top: `${node.y}%` }}
							>
								<div
									className={cn(
										"relative rounded-sm px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm transition-transform",
										node.kind === "value" ? "bg-[#f5f07a]" : "bg-[#b8b5ae]",
										isLive && "scale-105"
									)}
								>
									{node.label}
									{showBadge ? (
										<button
											type="button"
											aria-label={`Inspect expression on ${node.label}`}
											className={cn(
												"absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 font-mono text-[10px] text-amber-300 ring-1 ring-amber-400/50 transition-transform hover:scale-110",
												isLive && "bg-amber-400 text-neutral-900"
											)}
											onMouseEnter={() => setHovered(node.id)}
											onMouseLeave={() => setHovered(null)}
											onClick={(e) => {
												e.stopPropagation();
												setPinned((prev) =>
													prev === node.id ? null : node.id
												);
											}}
										>
											*
										</button>
									) : null}
								</div>

								{isLive && node.expression ? (
									<div
										className={cn(
											"absolute top-[calc(100%+10px)] left-1/2 z-20 w-48 -translate-x-1/2 rounded-md border border-neutral-600 bg-neutral-950 p-3 text-left shadow-xl",
											pinned === node.id && "ring-1 ring-amber-400/40"
										)}
										onMouseEnter={() => setHovered(node.id)}
										onMouseLeave={() => setHovered(null)}
									>
										<p className="text-[10px] tracking-wide text-neutral-500 uppercase">
											{pinned === node.id ? "Pinned expression" : "Expression"}
										</p>
										<p className="mt-1 font-mono text-xs leading-relaxed break-words text-amber-100 select-text">
											{node.expression}
										</p>
										{pinned === node.id ? (
											<p className="mt-2 text-[10px] text-neutral-500">
												Esc / outside click to close
											</p>
										) : null}
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</section>

			<section className="mt-16">
				<h2 className="mb-4 text-xl font-semibold">Two tools, one product</h2>
				<ProductContrast emphasis="ducker" />
				{active ? (
					<p className="mt-4 text-sm text-neutral-500">
						Active demo formula:{" "}
						<span className="font-mono text-neutral-300">
							{active.expression}
						</span>
					</p>
				) : null}
			</section>
		</div>
	);
}
