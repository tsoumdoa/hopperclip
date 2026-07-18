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

	it("parses Reparameterize on a standalone parameter container", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">curve-type-guid</item><item name="Name">Curve</item></items>
						<chunks><chunk name="Container"><items>
							<item name="InstanceGuid">curve-instance-guid</item>
							<item name="NickName">Crv</item>
							<item name="Reparameterize" type_name="gh_bool">true</item>
						</items></chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml);

		expect(parsed.components.Crv.outputs.value.options).toEqual({
			reparameterize: true,
		});
	});

	it("parses Unitize on a component output parameter", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">eval-type-guid</item><item name="Name">Evaluate Surface</item></items>
						<chunks><chunk name="Container">
							<items><item name="InstanceGuid">eval-instance-guid</item><item name="NickName">EvalSrf</item></items>
							<chunks><chunk name="param_output" index="3"><items>
								<item name="NickName">V</item>
								<item name="InstanceGuid">v-output-guid</item>
								<item name="Unitize" type_name="gh_bool">true</item>
							</items></chunk></chunks>
						</chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml);

		expect(parsed.components.EvalSrf.outputs.v.options).toEqual({
			unitize: true,
		});
	});
});
