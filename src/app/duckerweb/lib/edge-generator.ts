import type { Edge } from "@xyflow/react";
import type { ParsedGrasshopper } from "parser/src/types";

export function generateEdges(
	wires: ParsedGrasshopper["wires"],
	nodeIds: Set<string>
): Edge[] {
	return wires
		.map((wire): Edge | null => {
			const sourceId = wire.from.split(".")[0];
			const targetId = wire.to.split(".")[0];

			if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
				return null;
			}

			return {
				id:
					wire.sourceComponentGuid && wire.targetPortGuid
						? `e-${wire.sourceComponentGuid.substring(0, 8)}-${wire.targetPortGuid.substring(0, 8)}`
						: wire.sourceComponentGuid
							? `e-${wire.sourceComponentGuid.substring(0, 8)}`
							: `e-${wire.targetPortGuid?.substring(0, 8) ?? Math.random().toString(36).slice(2)}`,
				type: "default",
				source: sourceId,
				sourceHandle: wire.from,
				target: targetId,
				targetHandle: wire.to,
			} as Edge;
		})
		.filter((edge): edge is Edge => edge !== null);
}
