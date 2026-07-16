import { describe, expect, it } from "vitest";
import { buildGhJson } from "./parser.js";

describe("buildGhJson parameter options", () => {
	it("parses ReverseData on a standalone parameter container", () => {
		const xml = `
			<Archive name="Root">
				<items><item name="ArchiveVersion"><Major>0</Major><Minor>2</Minor><Revision>2</Revision></item></items>
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items>
							<item name="GUID">3e8ca6be-fda8-4aaf-b5c0-3c54c8bb7312</item>
							<item name="Name">Number</item>
						</items>
						<chunks><chunk name="Container"><items>
							<item name="InstanceGuid">610062a5-2ec3-4e88-b3e4-c493afb088cf</item>
							<item name="NickName">Num</item>
							<item name="ReverseData" type_name="gh_bool">true</item>
						</items></chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml);

		expect(parsed.components.Num.outputs.value.options).toEqual({
			reverse: true,
		});
	});

	it("parses ReverseData on a component input parameter", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">type-guid</item><item name="Name">Example</item></items>
						<chunks><chunk name="Container">
							<items><item name="InstanceGuid">component-guid</item><item name="NickName">Example</item></items>
							<chunks><chunk name="ParameterData">
								<items><item name="InputCount">1</item><item name="OutputCount">0</item></items>
								<chunks><chunk name="InputParam" index="0"><items>
									<item name="NickName">A</item>
									<item name="InstanceGuid">input-guid</item>
									<item name="ReverseData" type_name="gh_bool">true</item>
								</items></chunk></chunks>
							</chunk></chunks>
						</chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml);

		expect(parsed.components.Example.inputs.a.options).toEqual({
			reverse: true,
		});
	});
});
