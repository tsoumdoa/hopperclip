import type { ParsedComponent } from "../types/type";

export function ComponentCard({ component }: { component: ParsedComponent }) {
	const inputs = Object.values(component.inputs);
	const outputs = Object.values(component.outputs);

	return (
		<div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
			<h3 className="mb-1 text-lg font-semibold text-white">
				{component.nickName}
			</h3>
			{component.library && (
				<p className="mb-1 text-xs font-medium text-purple-400">
					{component.library}
				</p>
			)}
			{component.type && (
				<p className="mb-2 text-sm text-neutral-400">Type: {component.type}</p>
			)}
			{component.description && (
				<p className="mb-3 text-sm text-neutral-300">{component.description}</p>
			)}

			{inputs.length > 0 && (
				<div className="mb-2">
					<p className="mb-1 text-xs font-medium text-neutral-500 uppercase">
						Inputs
					</p>
					<div className="space-y-1">
						{inputs.map((input, idx) => (
							<div key={idx} className="flex gap-2 text-sm">
								<span className="text-blue-400">{input.nick}</span>
								{input.description && (
									<span className="text-neutral-400">
										- {input.description}
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{outputs.length > 0 && (
				<div>
					<p className="mb-1 text-xs font-medium text-neutral-500 uppercase">
						Outputs
					</p>
					<div className="space-y-1">
						{outputs.map((output, idx) => (
							<div key={idx} className="flex gap-2 text-sm">
								<span className="text-green-400">{output.nick}</span>
								{output.description && (
									<span className="text-neutral-400">
										- {output.description}
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
