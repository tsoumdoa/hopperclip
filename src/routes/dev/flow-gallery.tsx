import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowDownToLine } from "lucide-react";
import { GHFlowCanvas } from "@/features/gh-flow/components/gh-flow-canvas";
import {
	flowGalleryEdges,
	flowGalleryNodes,
} from "@/features/gh-flow/flow-gallery-fixtures";

export const Route = createFileRoute("/dev/flow-gallery")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	head: () => ({
		meta: [{ title: "Flow Gallery | Hopper Clip" }],
	}),
	component: FlowGallery,
});

function FlowGallery() {
	return (
		<main className="relative h-screen min-h-[600px] w-screen">
			<GHFlowCanvas nodes={flowGalleryNodes} edges={flowGalleryEdges} />
			<aside className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-[#999790] bg-[#ebe9e4]/95 px-3 py-2.5 text-xs text-[#3f3f3c] shadow-md">
				<p className="mb-2 font-semibold">Wire display gallery</p>
				<div className="grid grid-cols-[52px_70px] items-center gap-x-2 gap-y-1.5">
					<span>Normal</span>
					<span className="h-px bg-[#555552]" />
					<span>Faint</span>
					<span className="h-px bg-[#555552]/30" />
					<span>Hidden</span>
					<span className="border-t border-dashed border-[#555552]/35" />
				</div>
				<p className="mt-3 mb-1 font-semibold">Port option badges</p>
				<div className="flex items-center gap-2 text-[11px] text-[#65645f]">
					<span className="flex size-3.5 items-center justify-center rounded-[3px] border border-[#9a9a9a] bg-[#f4f4f4] text-[#333]">
						<ArrowDownToLine size={9} strokeWidth={2.5} />
					</span>
					<span>Normal — light chip, dark glyph</span>
				</div>
				<div className="mt-1 flex items-center gap-2 text-[11px] text-[#65645f]">
					<span className="flex size-3.5 items-center justify-center rounded-[3px] bg-[#444] text-[#f2f2f2]">
						<ArrowDownToLine size={9} strokeWidth={2.5} />
					</span>
					<span>Hidden / Locked — dark chip, light glyph</span>
				</div>
				<p className="mt-2 max-w-52 text-[11px] text-[#65645f]">
					Click Locked or Python 3 to reveal their hidden wire, or use the
					Hidden wires toggle.
				</p>
			</aside>
		</main>
	);
}
