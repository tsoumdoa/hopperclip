import {
	ArrowDownToLine,
	ArrowUpToLine,
	Asterisk,
	createLucideIcon,
	Undo2,
	type LucideIcon,
} from "lucide-react";
import type { PortOptions as ParsedPortOptions } from "parser/src/types";
import type { CSSProperties } from "react";
import type { GHRuntimeState } from "../lib/runtime-palette";
import type { Port } from "../types/type";

type OptionBadge = {
	key: string;
	label: string;
	Icon: LucideIcon;
	appearance?: "grasshopper";
};

// Grasshopper's simplify glyph: the zipper "Y" — two branches merging
// into a single stem.
const GrasshopperSimplifyIcon = createLucideIcon("GrasshopperSimplify", [
	[
		"path",
		{
			d: "M6.5 4.5 12 11m5.5-6.5L12 11m0 0v8.5",
			key: "simplify-y",
		},
	],
]);

// Grasshopper's reparameterize/unitize glyph: a bell curve sitting on a
// baseline, drawn white on the standard dark chip.
const GrasshopperTransformIcon = createLucideIcon("GrasshopperTransform", [
	[
		"path",
		{
			d: "M3 18.5c2.4 0 3.2-2.85 4.35-6.98C8.33 7.93 9.38 4.88 12 4.88s3.67 3.05 4.65 6.64C17.8 15.65 18.6 18.5 21 18.5H3Z",
			fill: "currentColor",
			stroke: "none",
			key: "domain-profile",
		},
	],
	[
		// Baseline runs through the hump's base so the combined mark is
		// vertically centered in the 24px viewBox (bbox ≈ 4.9–19.25).
		"path",
		{
			d: "M2.75 18.5h18.5",
			strokeWidth: "1.5",
			key: "domain-baseline",
		},
	],
]);

// 14px chip + 2px inter-badge gap; the flat +2 covers the wider 4px gap
// between the badge group and the label.
const OPTION_WIDTH = 16;

function getOptionBadges(options?: ParsedPortOptions): OptionBadge[] {
	if (!options) return [];

	const badges: OptionBadge[] = [];
	if (options.mapping === "flatten") {
		badges.push({ key: "flatten", label: "Flatten", Icon: ArrowDownToLine });
	}
	if (options.mapping === "graft") {
		badges.push({ key: "graft", label: "Graft", Icon: ArrowUpToLine });
	}
	if (options.mapping === "simplify" || options.simplify) {
		badges.push({
			key: "simplify",
			label: "Simplify",
			Icon: GrasshopperSimplifyIcon,
		});
	}
	if (options.mapping === "reparametrize" || options.reparameterize) {
		badges.push({
			key: "reparameterize",
			label: "Reparameterize",
			Icon: GrasshopperTransformIcon,
			appearance: "grasshopper",
		});
	}
	if (options.unitize) {
		badges.push({
			key: "unitize",
			label: "Unitize",
			Icon: GrasshopperTransformIcon,
			appearance: "grasshopper",
		});
	}
	if (options.reverse) {
		badges.push({ key: "reverse", label: "Reverse", Icon: Undo2 });
	}
	if (options.expression) {
		badges.push({ key: "expression", label: "Expression", Icon: Asterisk });
	}

	return badges;
}

export function getPortContentWidth(port: Port, approximateCharWidth: number) {
	const optionCount = getOptionBadges(port.options).length;
	return (
		port.label.length * approximateCharWidth +
		optionCount * OPTION_WIDTH +
		(optionCount > 0 ? 2 : 0)
	);
}

function optionSummary(port: Port, badges: OptionBadge[]) {
	if (badges.length === 0) return undefined;

	const labels = badges.map(({ label }) => label).join(" · ");
	return port.options?.expression
		? `${labels}\nExpression: ${port.options.expression}`
		: labels;
}

// Default (normal) nodes sit on a light body, so badges read best as a light
// chip with a dark glyph. Hidden/locked nodes dim the body to mid/dark grey,
// where the original dark chip with a light glyph keeps the icons legible.
function badgeAppearanceClass(runtimeState: GHRuntimeState) {
	return runtimeState === "normal"
		? "border border-[#9a9a9a] bg-[#f4f4f4] text-[#333]"
		: "bg-[#444] text-[#f2f2f2]";
}

export function PortLabel({
	port,
	align,
	style,
	runtimeState = "normal",
}: {
	port: Port;
	align: "left" | "center" | "right";
	style?: CSSProperties;
	runtimeState?: GHRuntimeState;
}) {
	const badges = getOptionBadges(port.options);
	const summary = optionSummary(port, badges);
	const badgeClass = badgeAppearanceClass(runtimeState);

	return (
		<span
			className={`pointer-events-auto flex w-full min-w-0 items-center gap-1 leading-none whitespace-nowrap ${
				align === "right"
					? "justify-end text-right"
					: align === "center"
						? "justify-center text-center"
						: "justify-start text-left"
			}`}
			style={style}
			title={summary}
			aria-label={
				summary ? `${port.label}: ${summary.replace("\n", ". ")}` : undefined
			}
		>
			{badges.length > 0 && (
				<span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
					{badges.map(({ key, label, Icon, appearance }) => (
						<span
							key={key}
							className={`flex size-3.5 items-center justify-center rounded-[3px] ${badgeClass}`}
							data-port-option={key}
							title={
								key === "expression" && port.options?.expression
									? `Expression: ${port.options.expression}`
									: label
							}
						>
							<Icon
								size={appearance === "grasshopper" ? 10 : 9}
								strokeWidth={appearance === "grasshopper" ? 1.5 : 2.5}
							/>
						</span>
					))}
				</span>
			)}
			<span className="min-w-0">{port.label}</span>
		</span>
	);
}
