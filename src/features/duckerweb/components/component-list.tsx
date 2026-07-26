import type { ParsedGrasshopper } from "parser/src/types";
import type { ParsedComponent } from "../types/type";
import { ComponentCard } from "./ComponentCard";

interface ComponentListProps {
	parsedData: ParsedGrasshopper;
}

export function ComponentList({ parsedData }: ComponentListProps) {
	const components: ParsedComponent[] = Object.values(
		parsedData.components
	).map((c) => ({
		id: c.id,
		type: c.type,
		nickName: c.nickName,
		description: c.description,
		library: c.library,
		inputs: c.inputs,
		outputs: c.outputs,
	}));

	return (
		<div>
			{parsedData.metadata?.libraries &&
				parsedData.metadata.libraries.length > 0 && (
					<div className="mb-4 flex flex-wrap gap-2">
						{parsedData.metadata.libraries.map((lib, idx) => (
							<span
								key={idx}
								className="rounded-full bg-purple-900/30 px-3 py-1 text-xs font-medium text-purple-400"
							>
								{lib.name}
							</span>
						))}
					</div>
				)}
			<p className="mb-4 text-neutral-400">
				Found {components.length} component(s)
			</p>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				{components.map((comp) => (
					<ComponentCard key={comp.id} component={comp} />
				))}
			</div>
		</div>
	);
}
