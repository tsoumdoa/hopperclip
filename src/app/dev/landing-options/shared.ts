import type { ComponentType } from "react";
import {
	Boxes,
	ClipboardPaste,
	FileCode2,
	Layers,
	Share2,
	ShieldCheck,
} from "lucide-react";

export type Icon = ComponentType<{ className?: string }>;

export const heroCopy = {
	eyebrow: "the grasshopper snippet manager",
	headline: "Grasshopper, sorted.",
	sub: "Save your Grasshopper definitions as tagged, searchable snippets — paste GhXml or drop a .gh, then copy them back into Rhino or share them with a link. Visualize and diff any script in the browser with DuckerWeb.",
	cta: "Get started — it's free",
	trust:
		"Free and open-source. Paste it, save it, reuse it — and share a snippet with anyone, no Rhino needed to open the link.",
};

export const cases: {
	icon: Icon;
	eyebrow: string;
	title: string;
	body: string;
}[] = [
	{
		icon: Layers,
		eyebrow: "Save & organize",
		title: "Build a real snippet library.",
		body: "Paste GhXml or drop a .gh to save any definition as a card with a title, description, and tags. Sort and filter your library instead of digging through folders of mystery files.",
	},
	{
		icon: ClipboardPaste,
		eyebrow: "Reuse anywhere",
		title: "Copy it straight back into Rhino.",
		body: "Every snippet copies out as GhXml, ready to paste back onto the Grasshopper canvas. Your best-built definitions stay one click away.",
	},
	{
		icon: Share2,
		eyebrow: "Share a link",
		title: "Send a snippet, not a file.",
		body: "Share any card with a link. Whoever opens it can view the definition right in the browser — no account, no Rhino, no plugins to install.",
	},
];

export const features: { icon: Icon; title: string; body: string }[] = [
	{
		icon: Layers,
		title: "Snippet library",
		body: "Save definitions as cards with titles, descriptions, and tags — searchable and sortable, not a folder of .gh files.",
	},
	{
		icon: ClipboardPaste,
		title: "Paste or drop",
		body: "Add a snippet by pasting GhXml straight from the Grasshopper canvas, or dropping a .gh file into your library.",
	},
	{
		icon: FileCode2,
		title: "Copy back as GhXml",
		body: "Copy any snippet out as GhXml and paste it straight back into Grasshopper. Reuse your best definitions in seconds.",
	},
	{
		icon: Share2,
		title: "One-link sharing",
		body: "Share any card with a link. Anyone can open and view it in the browser — no account needed.",
	},
	{
		icon: Boxes,
		title: "Flow · list · JSON",
		body: "See any definition three ways in DuckerWeb: the Flow node graph, a flat component list, or raw JSON.",
	},
	{
		icon: ShieldCheck,
		title: "Open-source & self-hostable",
		body: "MIT-licensed. Use the hosted app or run your own — your snippets stay under your control.",
	},
];

export const stats: { value: string; label: string }[] = [
	{ value: "Free", label: "& open-source" },
	{ value: "3", label: "views · flow/list/json" },
	{ value: "0", label: "plugins to install" },
	{ value: "MIT", label: "licensed" },
];

export const faqs: { q: string; a: string }[] = [
	{
		q: "What is Hopper Clip?",
		a: "A snippet manager for Grasshopper. Save your definitions as tagged, searchable cards, copy them back into Rhino to reuse, and share any snippet with a link — all from the browser.",
	},
	{
		q: "How do I add a snippet?",
		a: "Paste GhXml copied straight from the Grasshopper canvas, or drop a .gh file into your library. Give it a title, description, and tags, and it's saved as a card you can reuse or share.",
	},
	{
		q: "What is DuckerWeb?",
		a: "DuckerWeb is our free, browser-only viewer for Grasshopper definitions. Drop a .gh or paste GhXml to see it as a Flow node graph, a component list, or raw JSON — and diff two versions to see what changed. No account required.",
	},
	{
		q: "Do reviewers need Rhino or Grasshopper?",
		a: "No. Anyone you share a link with can open and view the definition in any browser — no Rhino, no Grasshopper, no plugins to install.",
	},
	{
		q: "Can I self-host it?",
		a: "Yes. Hopper Clip is open-source under the MIT license. Use the hosted version at hopperclip.com, or clone the repo and run your own.",
	},
];
