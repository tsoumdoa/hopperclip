"use client";

import { useEffect, useMemo } from "react";
import {
	ReactFlow,
	Background,
	BackgroundVariant,
	Controls,
	useReactFlow,
	type NodeTypes,
	type EdgeTypes,
} from "@xyflow/react";
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
import { GHEdge } from "./GHEdge";
import type { GHFlowCanvasProps } from "../types/type";

const nodeTypes: NodeTypes = {
	panel: GHPanelNode as NodeTypes[string],
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

export function GHFlowCanvas({ nodes, edges, focus }: GHFlowCanvasProps) {
	const defaultEdgeOptions = useMemo(
		() => ({
			type: "default",
		}),
		[]
	);

	return (
		<div className="gh-canvas-container">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				defaultEdgeOptions={defaultEdgeOptions}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				minZoom={0.1}
				maxZoom={4}
				proOptions={{ hideAttribution: true }}
				colorMode="dark"
			>
				<Background
					variant={BackgroundVariant.Lines}
					gap={50}
					size={1}
					bgColor="#cbc9c8"
					color="#bbb8af"
				/>
				<Controls />
				<FocusOnNode focus={focus} />
			</ReactFlow>
		</div>
	);
}
