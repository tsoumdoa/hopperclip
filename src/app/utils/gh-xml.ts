import { GhXml } from "../../types/types";
import { XMLParser, XMLValidator, type XMLMetaData } from "fast-xml-parser";

type XmlNode = { [key: symbol]: XMLMetaData | undefined };

type GhXmlChunk = XmlNode & {
	name?: string;
	chunks?: { chunk?: GhXmlChunk[] };
};

type GhXmlArchive = {
	chunks?: XmlNode & {
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

function parseGhXml(xml: string, captureMetaData = false) {
	return new XMLParser({ ...xmlParserOptions, captureMetaData }).parse(xml) as {
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

	const parsed = parseGhXml(xml, true);
	const archive = parsed.Archive;
	const chunks = archive?.chunks?.chunk;
	if (!archive?.chunks || !chunks) return xml;

	if (chunks.some((chunk) => chunk.name === "Clipboard")) return xml;

	const definition = chunks.find((chunk) => chunk.name === "Definition");
	if (!definition) return xml;

	// Use parser boundaries so comments, CDATA and sibling chunks cannot be
	// mistaken for the definition. Slice the source to preserve its payload.
	const definitionRange = sourceRange(xml, definition);
	const outerRange = sourceRange(xml, archive.chunks);
	if (!definitionRange || !outerRange) return xml;

	const outerChunksOpenEnd = xml.indexOf(">", outerRange.start) + 1;
	const outerClosingStart = xml.lastIndexOf("</chunks", outerRange.end);
	const inner = xml.slice(outerChunksOpenEnd, outerClosingStart);
	const leadingWhitespace = /^\s*/.exec(inner)?.[0] ?? "";
	const trailingWhitespace = /\s*$/.exec(inner)?.[0] ?? "";
	const outerOpening = xml
		.slice(outerRange.start, outerChunksOpenEnd)
		.replace(/\s+count\s*=\s*(['"])[^'"]*\1/, "")
		.replace(/>$/, ' count="1">');
	const clipboardChunk = xml
		.slice(definitionRange.start, definitionRange.end)
		.replace(/\s+name\s*=\s*(['"])[^'"]*\1/, ' name="Clipboard"');

	return (
		xml.slice(0, outerRange.start) +
		outerOpening +
		leadingWhitespace +
		clipboardChunk +
		trailingWhitespace +
		xml.slice(outerClosingStart)
	);
}

function sourceRange(xml: string, node: XmlNode) {
	const metadata = node[XMLParser.getMetaDataSymbol() as symbol];
	if (metadata?.startIndex === undefined || metadata.endIndex === undefined)
		return undefined;

	// fast-xml-parser indexes after normalizing CRLF to LF. Map those offsets
	// back to the input so Windows line endings and script text stay untouched.
	let start = metadata.startIndex;
	let end = metadata.endIndex;
	for (const match of xml.matchAll(/\r\n/g)) {
		if (match.index >= end) break;
		if (match.index < start) start += 1;
		end += 1;
	}
	return { start, end };
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
