import { GHFlowCanvas } from "@/app/duckerweb/components/GHFlowCanvas";
import {
	flowGalleryEdges,
	flowGalleryNodes,
} from "@/app/dev/flow-gallery-fixtures";

export default function FlowGallery() {
	return (
		<main className="h-screen min-h-[600px] w-screen">
			<GHFlowCanvas nodes={flowGalleryNodes} edges={flowGalleryEdges} />
		</main>
	);
}
