import { XMLParser } from "fast-xml-parser";
import { parseGrasshopper, type ParsedXml } from "../../src/parser.js";
import type { ParseOptions } from "../../src/types.js";

async function main() {
	const args = process.argv.slice(2);

	// Check for --visuals flag
	const visualsIndex = args.indexOf("--visuals");
	const includeVisuals = visualsIndex !== -1;

	// Remove --visuals from args if present
	if (includeVisuals) {
		args.splice(visualsIndex, 1);
	}

	const inputFile = args[0] || "brep-area-Wire_1.xml";
	const outputFile = args[1] || inputFile.replace(".xml", "_optimized.json");

	console.log(`Parsing ${inputFile}...`);
	if (includeVisuals) {
		console.log("  (Including visual data)");
	}

	try {
		const xmlContent = await Bun.file(inputFile).text();

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "",
			parseAttributeValue: false,
			parseTagValue: false,
			trimValues: true,
			isArray: (name) => {
				// Always return arrays for these elements
				return ["item", "chunk"].includes(name);
			},
		});

		const parsed = parser.parse(xmlContent) as ParsedXml;

		const options: ParseOptions = {
			includeVisuals,
		};

		const ghData = parseGrasshopper(parsed, options);

		await Bun.write(outputFile, JSON.stringify(ghData, null, 2));

		console.log(`✓ Written to ${outputFile}`);
		console.log(`  Components: ${Object.keys(ghData.components).length}`);
		console.log(`  Wires: ${ghData.wires.length}`);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main();
