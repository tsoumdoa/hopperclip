import { motion } from "motion/react";

/**
 * Quiet product frame for the LP: graph + soft diff highlight.
 * Dark palette to match the landing page — not the real GH canvas look.
 */
export function InspectDiffVisual() {
	return (
		<div
			className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
			aria-hidden
		>
			<svg
				viewBox="0 0 480 220"
				className="h-auto w-full"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<pattern
						id="lp-gh-grid"
						width="40"
						height="40"
						patternUnits="userSpaceOnUse"
					>
						<path
							d="M 40 0 L 0 0 0 40"
							fill="none"
							stroke="#262626"
							strokeWidth="1"
						/>
					</pattern>
				</defs>
				<rect width="480" height="220" fill="#0a0a0a" />
				<rect width="480" height="220" fill="url(#lp-gh-grid)" />

				{/* wires */}
				<motion.path
					d="M 118 70 C 160 70, 160 70, 190 70"
					fill="none"
					stroke="#525252"
					strokeWidth="1.5"
					initial={{ pathLength: 0 }}
					whileInView={{ pathLength: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}
				/>
				<motion.path
					d="M 118 150 C 160 150, 160 110, 190 110"
					fill="none"
					stroke="#86efac"
					strokeWidth="2"
					initial={{ pathLength: 0, opacity: 0 }}
					whileInView={{ pathLength: 1, opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.9, delay: 0.55 }}
				/>
				<motion.path
					d="M 300 90 C 340 90, 340 150, 362 150"
					fill="none"
					stroke="#f87171"
					strokeWidth="1.5"
					strokeDasharray="4 3"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 0.85 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.7 }}
				/>

				{/* value nodes */}
				<g transform="translate(48, 48)">
					<rect
						width="70"
						height="44"
						rx="4"
						fill="#262626"
						stroke="#525252"
					/>
					<text
						x="10"
						y="18"
						fontSize="9"
						fill="#737373"
						fontFamily="ui-monospace, monospace"
					>
						Number
					</text>
					<text
						x="10"
						y="34"
						fontSize="11"
						fill="#e5e5e5"
						fontFamily="ui-sans-serif, system-ui"
					>
						12.0
					</text>
				</g>

				<g transform="translate(48, 128)">
					<rect
						width="70"
						height="44"
						rx="4"
						fill="#262626"
						stroke="#525252"
					/>
					<text
						x="10"
						y="18"
						fontSize="9"
						fill="#737373"
						fontFamily="ui-monospace, monospace"
					>
						Number
					</text>
					<text
						x="10"
						y="34"
						fontSize="11"
						fill="#e5e5e5"
						fontFamily="ui-sans-serif, system-ui"
					>
						4.0
					</text>
				</g>

				{/* component — unmodified */}
				<g transform="translate(190, 48)">
					<rect
						width="110"
						height="64"
						rx="4"
						fill="#171717"
						stroke="#404040"
					/>
					<rect width="110" height="18" rx="4" fill="#262626" />
					<rect y="14" width="110" height="8" fill="#262626" />
					<text
						x="8"
						y="13"
						fontSize="9"
						fill="#d4d4d4"
						fontFamily="ui-sans-serif, system-ui"
					>
						Divide Curve
					</text>
					<circle cx="0" cy="22" r="4" fill="#525252" />
					<circle cx="0" cy="42" r="4" fill="#525252" />
					<circle cx="110" cy="32" r="4" fill="#525252" />
				</g>

				{/* component — modified */}
				<motion.g
					transform="translate(190, 128)"
					initial={{ opacity: 0.35 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.45 }}
				>
					<rect
						width="110"
						height="52"
						rx="4"
						fill="#171717"
						stroke="#fbbf24"
						strokeWidth="2"
					/>
					<rect width="110" height="18" rx="4" fill="#262626" />
					<rect y="14" width="110" height="8" fill="#262626" />
					<text
						x="8"
						y="13"
						fontSize="9"
						fill="#d4d4d4"
						fontFamily="ui-sans-serif, system-ui"
					>
						Extrude
					</text>
					<circle cx="0" cy="28" r="4" fill="#525252" />
					<circle cx="110" cy="28" r="4" fill="#525252" />
				</motion.g>

				{/* panel — added */}
				<motion.g
					transform="translate(362, 128)"
					initial={{ opacity: 0, y: 6 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.75 }}
				>
					<rect
						width="70"
						height="44"
						rx="4"
						fill="#171717"
						stroke="#86efac"
						strokeWidth="2"
					/>
					<text
						x="10"
						y="18"
						fontSize="9"
						fill="#737373"
						fontFamily="ui-monospace, monospace"
					>
						Panel
					</text>
					<text
						x="10"
						y="34"
						fontSize="10"
						fill="#e5e5e5"
						fontFamily="ui-sans-serif, system-ui"
					>
						ok
					</text>
				</motion.g>
			</svg>

			<div className="absolute right-3 bottom-3 flex gap-2 font-mono text-[10px] tracking-wide uppercase">
				<span className="rounded bg-green-300 px-1.5 py-0.5 font-bold text-neutral-800">
					+ added
				</span>
				<span className="rounded border border-neutral-700 bg-neutral-950/90 px-1.5 py-0.5 text-amber-300">
					~ modified
				</span>
				<span className="rounded border border-neutral-700 bg-neutral-950/90 px-1.5 py-0.5 text-red-400">
					− removed
				</span>
			</div>
		</div>
	);
}
