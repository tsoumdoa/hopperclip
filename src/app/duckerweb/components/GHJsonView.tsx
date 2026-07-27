import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import type { ParsedGrasshopper } from "parser/src/types";

interface GHJsonViewProps {
	data: ParsedGrasshopper;
}

export function GHJsonView({ data }: GHJsonViewProps) {
	const [html, setHtml] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function highlight() {
			const { createHighlighter } = await import("shiki/bundle/web");
			const highlighter = await createHighlighter({
				themes: ["catppuccin-mocha"],
				langs: ["json"],
			});
			if (!cancelled) {
				const rendered = highlighter.codeToHtml(JSON.stringify(data, null, 2), {
					lang: "json",
					theme: "catppuccin-mocha",
				});
				setHtml(DOMPurify.sanitize(rendered));
			}
		}

		highlight();
		return () => {
			cancelled = true;
		};
	}, [data]);

	return (
		<div className="gh-json-viewer mb-6 w-full overflow-x-hidden rounded-lg border border-neutral-800 bg-[#1e1e2e]">
			<div className="mx-auto w-full max-w-4xl p-4">
				{html ? (
					<div
						className="text-xs leading-relaxed"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : (
					<pre className="font-mono text-xs text-neutral-500">
						Loading syntax highlighter...
					</pre>
				)}
			</div>
		</div>
	);
}
