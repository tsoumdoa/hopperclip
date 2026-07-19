"use client";

import { useEffect, useMemo, useState } from "react";
import {
	ReactFlow,
	Background,
	BackgroundVariant,
	Controls,
	Panel,
	useReactFlow,
	useViewport,
	type NodeTypes,
	type EdgeTypes,
} from "@xyflow/react";
import { Eye, EyeOff } from "lucide-react";
import "@xyflow/react/dist/style.css";

import { GHPanelNode } from "./GHPanelNode";
import { GHComponentNode } from "./GHComponentNode";
import { GHScriptNode } from "./GHScriptNode";
import { GHSliderNode } from "./GHSliderNode";
import { GHValueListNode } from "./GHValueListNode";
import { GHToggleNode } from "./GHToggleNode";
import { GHSwatchNode } from "./GHSwatchNode";
import { GHButtonNode } from "./GHButtonNode";
import { GHGroupNode } from "./GHGroupNode";
import { GHRelayNode } from "./GHRelayNode";
import { GHScribbleNode } from "./GHScribbleNode";
import { GHEdge } from "./GHEdge";
import type { GHFlowCanvasProps } from "../types/type";

const nodeTypes: NodeTypes = {
	panel: GHPanelNode as NodeTypes[string],
	scribble: GHScribbleNode as NodeTypes[string],
	value: GHPanelNode as NodeTypes[string],
	component: GHComponentNode as NodeTypes[string],
	script: GHScriptNode as NodeTypes[string],
	slider: GHSliderNode as NodeTypes[string],
	valueList: GHValueListNode as NodeTypes[string],
	toggle: GHToggleNode as NodeTypes[string],
	swatch: GHSwatchNode as NodeTypes[string],
	button: GHButtonNode as NodeTypes[string],
	group: GHGroupNode as NodeTypes[string],
	relay: GHRelayNode as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
	default: GHEdge as EdgeTypes[string],
};

function FocusOnNode({ focus }: { focus: GHFlowCanvasProps["focus"] }) {
	const { fitView } = useReactFlow();

	useEffect(() => {
		if (!focus) return;
		fitView({
			nodes: [{ id: focus.nodeId }],
			duration: 350,
			padding: 0.4,
			maxZoom: 1.2,
		});
	}, [focus, fitView]);

	return null;
}

function OriginAxes() {
	const { x, y } = useViewport();

	return (
		<div
			className="pointer-events-none absolute z-0 size-4 -translate-x-1/2 -translate-y-1/2"
			data-origin-marker="true"
			style={{ left: x, top: y }}
			aria-hidden="true"
		>
			<div className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-[#666864]/80" />
			<div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#666864]/80" />
		</div>
	);
}

export function GHFlowCanvas({ nodes, edges, focus }: GHFlowCanvasProps) {
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [revealHiddenWires, setRevealHiddenWires] = useState(false);
	const defaultEdgeOptions = useMemo(
		() => ({
			type: "default",
		}),
		[]
	);
	const visibleEdges = useMemo(
		() =>
			edges.map((edge) => {
				const wireStyle = edge.data?.wireStyle;
				if (wireStyle !== "hidden") return edge;

				return {
					...edge,
					data: {
						...edge.data,
						isRevealed:
							revealHiddenWires ||
							edge.source === selectedNodeId ||
							edge.target === selectedNodeId,
					},
				};
			}),
		[edges, revealHiddenWires, selectedNodeId]
	);

	return (
		<div className="gh-canvas-container">
			<ReactFlow
				nodes={nodes}
				edges={visibleEdges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				defaultEdgeOptions={defaultEdgeOptions}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				minZoom={0.1}
				maxZoom={4}
				proOptions={{ hideAttribution: true }}
				colorMode="dark"
				onNodeClick={(_, node) => setSelectedNodeId(node.id)}
				onPaneClick={() => setSelectedNodeId(null)}
			>
				<Background
					variant={BackgroundVariant.Lines}
					gap={50}
					size={1}
					bgColor="#cbc9c8"
					color="#bbb8af"
				/>
				<OriginAxes />
				<Controls />
				<Panel position="top-right">
					<button
						type="button"
						aria-pressed={revealHiddenWires}
						title={
							revealHiddenWires ? "Hide hidden wires" : "Reveal hidden wires"
						}
						onClick={() => setRevealHiddenWires((current) => !current)}
						className="flex items-center gap-1.5 rounded border border-[#8d8b86] bg-[#e5e3de]/95 px-2.5 py-1.5 text-xs font-medium text-[#3f3f3c] shadow-sm transition-colors hover:bg-white"
					>
						{revealHiddenWires ? <EyeOff size={14} /> : <Eye size={14} />}
						Hidden wires
					</button>
				</Panel>
				<FocusOnNode focus={focus} />
			</ReactFlow>
		</div>
	);
}
