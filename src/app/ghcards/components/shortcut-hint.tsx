import { Fragment } from "react";
import { useModifierKeyLabel } from "@/app/hooks/use-modifier-key-label";
import { Kbd } from "@/components/ui/kbd";

export function ShortcutHint() {
	const mod = useModifierKeyLabel();
	const shortcuts = [
		{ keys: [mod, "K"], label: "Search" },
		{ keys: [mod, "⇧", "A"], label: "New" },
		{ keys: [mod, "V"], label: "Paste" },
	];
	return (
		<div className="fixed right-4 bottom-4 z-30 hidden items-center gap-3 rounded-full border border-white/[0.08] bg-neutral-950/80 px-3.5 py-1.5 text-xs text-neutral-500 shadow-lg backdrop-blur-md md:flex">
			{shortcuts.map((shortcut, i) => (
				<Fragment key={shortcut.label}>
					{i > 0 && <span className="h-3 w-px bg-white/10" aria-hidden />}
					<span className="flex items-center gap-1.5">
						<span className="flex items-center gap-0.5">
							{shortcut.keys.map((key) => (
								<Kbd key={key}>{key}</Kbd>
							))}
						</span>
						{shortcut.label}
					</span>
				</Fragment>
			))}
		</div>
	);
}
