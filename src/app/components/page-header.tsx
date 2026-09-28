import type { ReactNode } from "react";

export function PageHeader(props: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 pt-2 pb-4 md:flex-row md:items-end md:justify-between">
			<div className="min-w-0">
				<h1 className="truncate text-2xl font-semibold tracking-tight">
					{props.title}
				</h1>
				{props.description && (
					<div className="mt-1 text-sm text-neutral-500">
						{props.description}
					</div>
				)}
			</div>
			{props.actions && (
				<div className="flex shrink-0 items-center gap-2">{props.actions}</div>
			)}
		</div>
	);
}
