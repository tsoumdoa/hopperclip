import { XMLParser } from "fast-xml-parser";
import { parseGrasshopper, type ParsedXml } from "../../src/parser.js";
import { glob } from "glob";
import * as path from "path";
import type { ParseOptions } from "../../src/types.js";

async function processFile(
	inputPath: string,
	options: ParseOptions
): Promise<void> {
	const outputPath = inputPath.replace(".xml", "_optimized.json");

	try {
		const xmlContent = await Bun.file(inputPath).text();

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "",
			parseAttributeValue: false,
			parseTagValue: false,
			trimValues: true,
			isArray: (name) => ["item", "chunk"].includes(name),
		});

		const parsed = parser.parse(xmlContent) as ParsedXml;
		const ghData = parseGrasshopper(parsed, options);

		await Bun.write(outputPath, JSON.stringify(ghData, null, 2));

		console.log(`✓ ${path.basename(inputPath)}`);
		console.log(`  Components: ${Object.keys(ghData.components).length}`);
		console.log(`  Wires: ${ghData.wires.length}`);
	} catch (error) {
		console.error(`✗ ${path.basename(inputPath)}: ${error}`);
	}
}

async function main() {
	const args = process.argv.slice(2);

	// Check for --visuals flag
	const visualsIndex = args.indexOf("--visuals");
	const includeVisuals = visualsIndex !== -1;

	// Remove --visuals from args if present
	if (includeVisuals) {
		args.splice(visualsIndex, 1);
	}

	const pattern = args[0] || "xmls/*.xml";

	console.log(`Looking for XML files matching: ${pattern}`);
	if (includeVisuals) {
		console.log("  (Including visual data)");
	}
	console.log();

	const files = await glob(pattern);

	if (files.length === 0) {
		console.log("No XML files found.");
		return;
	}

	console.log(`Found ${files.length} XML file(s)\n`);

	const options: ParseOptions = {
		includeVisuals,
	};

	for (const file of files.sort()) {
		await processFile(file, options);
		console.log();
	}

	console.log("Done!");
}

main();
