import type { ComponentType } from "react";
import {
	Boxes,
	FileCode2,
	GitCompareArrows,
	Layers,
	MessageSquare,
	MousePointerClick,
	Share2,
	ShieldCheck,
} from "lucide-react";

export type Icon = ComponentType<{ className?: string }>;

export const heroCopy = {
	eyebrow: "for individuals & teams",
	headline: "Grasshopper, reviewed.",
	sub: "Organize your own Grasshopper definitions. Share them with a team to inspect, compare, and review across versions — without anyone needing Rhino in front of them.",
	cta: "Get started — it's free",
	trust:
		"Nothing to install — no Rhino, no plugins, no setup for whoever opens the link.",
};

export const cases: {
	icon: Icon;
	eyebrow: string;
	title: string;
	body: string;
}[] = [
	{
		icon: MessageSquare,
		eyebrow: "Share for review",
		title: "Send one link instead of an attachment.",
		body: "Drop a .gh, get a URL. Reviewers open it in any browser — no Rhino, no plugins, no setup. Comments stay in your existing tools.",
	},
	{
		icon: MousePointerClick,
		eyebrow: "Inspect without Rhino",
		title: "Read the whole graph at a glance.",
		body: "Pan and zoom every component, wire, slider, and panel. Switch to a flat list for an inventory, or JSON for the raw structure.",
	},
	{
		icon: GitCompareArrows,
		eyebrow: "Diff between versions",
		title: "See what changed, not what's there.",
		body: "Drop in a second file to compare two versions. Added, removed, modified, and rewired components are highlighted — wire by wire.",
	},
];

export const features: { icon: Icon; title: string; body: string }[] = [
	{
		icon: Layers,
		title: "Snippet library",
		body: "Save definitions as cards with tags, titles, and descriptions — a real library, not a folder of mystery .gh files.",
	},
	{
		icon: Share2,
		title: "One-link sharing",
		body: "Generate a shareable URL for any card. Revoke or regenerate access whenever you want.",
	},
	{
		icon: GitCompareArrows,
		title: "Version diffing",
		body: "Compare two files side-by-side and see exactly which components were added, removed, or rewired.",
	},
	{
		icon: Boxes,
		title: "Graph · list · JSON",
		body: "Three views for every definition: the visual canvas, a flat component inventory, or raw structured JSON.",
	},
	{
		icon: FileCode2,
		title: "Copy as GhXml",
		body: "Paste Grasshopper XML directly — no file needed. Great for quick lookups and ad-hoc reviews.",
	},
	{
		icon: ShieldCheck,
		title: "Yours to self-host",
		body: "Open-source and self-hostable. Use the hosted app or run your own — your definitions stay under your control.",
	},
];

export const stats: { value: string; label: string }[] = [
	{ value: "0", label: "plugins to install" },
	{ value: "3", label: "views per definition" },
	{ value: "100%", label: "runs in the browser" },
	{ value: "MIT", label: "open-source license" },
];

export const faqs: { q: string; a: string }[] = [
	{
		q: "Do I need Rhino or Grasshopper installed?",
		a: "No. Hopper Clip runs entirely in the browser. Anyone you share a link with can inspect, review, and compare definitions without a single install — no Rhino, no Grasshopper, no plugins.",
	},
	{
		q: "How does the version diff work?",
		a: "Drop in two .gh files (or paste GhXml) and Hopper Clip highlights what changed between them: added, removed, modified, and rewired components are outlined wire-by-wire so you can review a change instead of the whole graph.",
	},
	{
		q: "Is my data uploaded to a server?",
		a: "Inspection and diffing run locally in your browser. Definitions you choose to save as cards are stored against your account so you can manage and reshare them later.",
	},
	{
		q: "What is DuckerWeb?",
		a: "DuckerWeb is our free, browser-only viewer — the same engine that powers inspection — available with no account required. Hopper Clip adds the library, sharing, and review workflow on top.",
	},
	{
		q: "Can I self-host it?",
		a: "Yes. Hopper Clip is open-source under the MIT license. Use the hosted version at hopperclip.com, or clone the repo and run your own.",
	},
];
