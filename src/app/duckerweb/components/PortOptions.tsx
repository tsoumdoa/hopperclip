import {
	ArrowDownToLine,
	ArrowUpToLine,
	Asterisk,
	GitMerge,
	Undo2,
	type LucideIcon,
} from "lucide-react";
import type { PortOptions as ParsedPortOptions } from "parser/src/types";
import type { CSSProperties } from "react";
import type { Port } from "../types/type";

type OptionBadge = {
	key: string;
	label: string;
	Icon: LucideIcon;
};

const OPTION_WIDTH = 15;

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
		badges.push({ key: "simplify", label: "Simplify", Icon: GitMerge });
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
		(optionCount > 0 ? 3 : 0)
	);
}

function optionSummary(port: Port, badges: OptionBadge[]) {
	if (badges.length === 0) return undefined;

	const labels = badges.map(({ label }) => label).join(" · ");
	return port.options?.expression
		? `${labels}\nExpression: ${port.options.expression}`
		: labels;
}

export function PortLabel({
	port,
	align,
	style,
}: {
	port: Port;
	align: "left" | "right";
	style?: CSSProperties;
}) {
	const badges = getOptionBadges(port.options);
	const summary = optionSummary(port, badges);

	return (
		<span
			className={`pointer-events-auto flex min-w-0 items-center gap-0.5 whitespace-nowrap ${
				align === "right" ? "justify-end text-right" : "justify-start text-left"
			}`}
			style={style}
			title={summary}
			aria-label={
				summary ? `${port.label}: ${summary.replace("\n", ". ")}` : undefined
			}
		>
			{badges.length > 0 && (
				<span className="flex shrink-0 items-center gap-px" aria-hidden="true">
					{badges.map(({ key, label, Icon }) => (
						<span
							key={key}
							className="flex size-3.5 items-center justify-center rounded-[3px] border border-[#777] bg-gradient-to-b from-[#f7f7f7] to-[#c7c7c7] text-[#555] shadow-sm"
							data-port-option={key}
							title={
								key === "expression" && port.options?.expression
									? `Expression: ${port.options.expression}`
									: label
							}
						>
							<Icon size={10} strokeWidth={3} />
						</span>
					))}
				</span>
			)}
			<span className="min-w-0">{port.label}</span>
		</span>
	);
}
