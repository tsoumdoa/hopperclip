import { GhXml } from "../../types/types";
import { XMLParser, XMLValidator } from "fast-xml-parser";

type GhXmlChunk = {
	name?: string;
	chunks?: { chunk?: GhXmlChunk[] };
};

type GhXmlArchive = {
	chunks?: {
		count?: string;
		chunk?: GhXmlChunk[];
	};
};

const xmlParserOptions = {
	ignoreAttributes: false,
	ignoreDeclaration: false,
	attributeNamePrefix: "",
	parseTagValue: false,
	parseAttributeValue: false,
	commentPropName: "comments",
	trimValues: true,
	isArray: (name: string) => name === "item" || name === "chunk",
} as const;

function parseGhXml(xml: string) {
	return new XMLParser(xmlParserOptions).parse(xml) as {
		"?xml"?: unknown;
		Archive?: GhXmlArchive;
	};
}

/**
 * Convert a full Grasshopper definition archive into the archive shape that
 * Grasshopper places on its clipboard. Clipboard archives are returned
 * unchanged, while file-only siblings such as Thumbnail are omitted.
 */
export function normalizeGhXmlForClipboard(xml: string): string {
	if (XMLValidator.validate(xml) !== true) return xml;

	const parsed = parseGhXml(xml);
	const archive = parsed.Archive;
	const chunks = archive?.chunks?.chunk;
	if (!archive?.chunks || !chunks) return xml;

	if (chunks.some((chunk) => chunk.name === "Clipboard")) return xml;

	const definition = chunks.find((chunk) => chunk.name === "Definition");
	if (!definition) return xml;

	const definitionMatch = /<chunk\b[^>]*\bname=(['"])Definition\1[^>]*>/.exec(
		xml
	);
	if (definitionMatch?.index === undefined) return xml;

	const definitionEnd = findElementEnd(xml, "chunk", definitionMatch.index);
	const outerChunksStart = xml.lastIndexOf("<chunks", definitionMatch.index);
	if (definitionEnd === undefined || outerChunksStart < 0) return xml;

	const outerChunksOpenEnd = xml.indexOf(">", outerChunksStart) + 1;
	const outerChunksEnd = findElementEnd(xml, "chunks", outerChunksStart);
	if (outerChunksOpenEnd === 0 || outerChunksEnd === undefined) return xml;

	const outerClosingStart = xml.lastIndexOf("</chunks>", outerChunksEnd);
	if (outerClosingStart < definitionEnd) return xml;

	const outerIndentStart = xml.lastIndexOf("\n", outerChunksStart) + 1;
	const outerIndent = xml.slice(outerIndentStart, outerChunksStart);
	const leadingWhitespace = xml.slice(
		outerChunksOpenEnd,
		definitionMatch.index
	);
	const outerOpening = xml
		.slice(outerChunksStart, outerChunksOpenEnd)
		.replace(/\bcount=(['"])[^'"]*\1/, 'count="1"');
	const clipboardChunk = xml
		.slice(definitionMatch.index, definitionEnd)
		.replace(/\bname=(['"])Definition\1/, 'name="Clipboard"');

	return (
		xml.slice(0, outerChunksStart) +
		outerOpening +
		leadingWhitespace +
		clipboardChunk +
		`\n${outerIndent}` +
		xml.slice(outerClosingStart)
	);
}

function findElementEnd(xml: string, tagName: string, start: number) {
	const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "g");
	let depth = 0;
	for (const match of xml.slice(start).matchAll(tagPattern)) {
		const tag = match[0];
		const absoluteEnd = start + (match.index ?? 0) + tag.length;
		if (tag.startsWith(`</${tagName}`)) {
			depth -= 1;
			if (depth === 0) return absoluteEnd;
		} else if (!tag.endsWith("/>")) {
			depth += 1;
		}
	}
	return undefined;
}

export function validateGhXml(xml: string) {
	const xmlValidation = XMLValidator.validate(xml);
	if (xmlValidation !== true) {
		return {
			isValid: false,
			errorMsg: `Malformed XML: ${xmlValidation.err.msg}`,
		};
	}

	const parsedFromXml = parseGhXml(xml);
	const keys = Object.keys(parsedFromXml);
	if (keys.length === 0) {
		return { isValid: false, errorMsg: "it's not GhXml" };
	}

	const validatedXml = GhXml.safeParse(parsedFromXml);
	delete parsedFromXml["?xml"];
	if (!validatedXml.success) {
		return {
			isValid: false,
			errorMsg: JSON.stringify(validatedXml.error, null, 2),
			parsedJson: parsedFromXml,
		};
	}

	const archiveChunks = parsedFromXml.Archive?.chunks?.chunk ?? [];
	const definition = archiveChunks.find(
		(chunk) =>
			chunk.name === "Clipboard" ||
			chunk.name === "Definition" ||
			chunk.name === "Archive"
	);
	const definitionObjects = definition?.chunks?.chunk?.find(
		(chunk) => chunk.name === "DefinitionObjects"
	);
	if (!definition || !definitionObjects) {
		return {
			isValid: false,
			errorMsg: "Grasshopper archive is missing DefinitionObjects",
		};
	}

	return {
		isValid: true,
	};
}
