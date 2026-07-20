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

describe("buildGhJson wire display", () => {
	it("parses normal, faint, and hidden styles from direct param_input chunks", () => {
		const target = (index: number, style?: number) => `
			<chunk name="Object" index="${index}">
				<items><item name="GUID">target-type-${index}</item><item name="Name">Target</item></items>
				<chunks><chunk name="Container">
					<items><item name="InstanceGuid">target-${index}</item><item name="NickName">Target ${index}</item></items>
					<chunks><chunk name="param_input" index="0"><items>
						<item name="NickName">I</item>
						<item name="InstanceGuid">input-${index}</item>
						<item name="Source" index="0">source-output</item>
						<item name="SourceCount">1</item>
						${style === undefined ? "" : `<item name="WireDisplay" type_name="gh_int32">${style}</item>`}
					</items></chunk></chunks>
				</chunk></chunks>
			</chunk>`;

		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">source-type</item><item name="Name">Source</item></items>
						<chunks><chunk name="Container">
							<items><item name="InstanceGuid">source</item><item name="NickName">Source</item></items>
							<chunks><chunk name="param_output" index="0"><items>
								<item name="NickName">O</item><item name="InstanceGuid">source-output</item>
							</items></chunk></chunks>
						</chunk></chunks>
					</chunk>
					${target(1)}
					${target(2, 1)}
					${target(3, 2)}
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml, { includeVisuals: true });

		expect(parsed.wires.map((wire) => wire.style)).toEqual([
			"normal",
			"faint",
			"hidden",
		]);
	});
});

describe("buildGhJson parameter visuals", () => {
	it("parses input and output bounds and pivots", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">sphere-type</item><item name="Name">Mesh Sphere</item></items>
						<chunks><chunk name="Container">
							<items><item name="InstanceGuid">sphere</item><item name="NickName">MSphere</item></items>
							<chunks>
								<chunk name="param_input" index="0">
									<items><item name="NickName">B</item><item name="InstanceGuid">base</item></items>
									<chunks><chunk name="Attributes"><items>
										<item name="Bounds" type_name="gh_drawing_rectanglef"><X>157</X><Y>504</Y><W>10</W><H>20</H></item>
										<item name="Pivot" type_name="gh_drawing_pointf"><X>163.5</X><Y>514</Y></item>
									</items></chunk></chunks>
								</chunk>
								<chunk name="param_output" index="0">
									<items><item name="NickName">M</item><item name="InstanceGuid">mesh</item></items>
									<chunks><chunk name="Attributes"><items>
										<item name="Bounds" type_name="gh_drawing_rectanglef"><X>197</X><Y>504</Y><W>14</W><H>80</H></item>
										<item name="Pivot" type_name="gh_drawing_pointf"><X>204</X><Y>544</Y></item>
									</items></chunk></chunks>
								</chunk>
							</chunks>
						</chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml, { includeVisuals: true });

		expect(parsed.components.MSphere.inputs.b.visuals).toEqual({
			bounds: { x: 157, y: 504, width: 10, height: 20 },
			pivot: { x: 163.5, y: 514 },
		});
		expect(parsed.components.MSphere.outputs.m.visuals).toEqual({
			bounds: { x: 197, y: 504, width: 14, height: 80 },
			pivot: { x: 204, y: 544 },
		});
	});
});

describe("buildGhJson component state", () => {
	it("falls back Hidden to true when omitted, and reads Selected from Attributes", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">hidden-type</item><item name="Name">Hidden Comp</item></items>
						<chunks><chunk name="Container">
							<items>
								<item name="Hidden" type_name="gh_bool">true</item>
								<item name="InstanceGuid">hidden-instance</item>
								<item name="NickName">HiddenComp</item>
							</items>
							<chunks><chunk name="Attributes"><items>
								<item name="Selected" type_name="gh_bool">true</item>
							</items></chunk></chunks>
						</chunk></chunks>
					</chunk>
					<chunk name="Object" index="1">
						<items><item name="GUID">visible-type</item><item name="Name">Visible Comp</item></items>
						<chunks><chunk name="Container">
							<items>
								<item name="Hidden" type_name="gh_bool">false</item>
								<item name="InstanceGuid">visible-instance</item>
								<item name="NickName">VisibleComp</item>
							</items>
							<chunks><chunk name="Attributes"><items>
								<item name="Selected" type_name="gh_bool">true</item>
							</items></chunk></chunks>
						</chunk></chunks>
					</chunk>
					<chunk name="Object" index="2">
						<items><item name="GUID">missing-type</item><item name="Name">Missing Comp</item></items>
						<chunks><chunk name="Container">
							<items>
								<item name="InstanceGuid">missing-instance</item>
								<item name="NickName">MissingComp</item>
							</items>
							<chunks><chunk name="Attributes"><items>
								<item name="Selected" type_name="gh_bool">true</item>
							</items></chunk></chunks>
						</chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const parsed = buildGhJson(xml, { includeVisuals: true });

		expect(parsed.components.HiddenComp.state).toEqual({
			hidden: true,
			locked: false,
			frozen: false,
			selected: true,
		});
		expect(parsed.components.VisibleComp.state).toEqual({
			hidden: false,
			locked: false,
			frozen: false,
			selected: true,
		});
		expect(parsed.components.MissingComp.state).toEqual({
			hidden: true,
			locked: false,
			frozen: false,
			selected: true,
		});
	});
});

describe("buildGhJson panel content", () => {
	it("preserves a custom panel heading separately from its body text", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">panel-type</item><item name="Name">Panel</item></items>
						<chunks><chunk name="Container"><items>
							<item name="InstanceGuid">panel-instance</item>
							<item name="NickName">constant 2</item>
							<item name="UserText">2</item>
						</items></chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const panel = buildGhJson(xml).components["constant 2"];

		expect(panel.nickName).toBe("constant 2");
		expect(panel.value).toEqual({ type: "panel", text: "2" });
	});
});

describe("buildGhJson scribble content", () => {
	it("preserves text geometry and font styling", () => {
		const xml = `
			<Archive name="Root">
				<chunks><chunk name="Clipboard"><chunks><chunk name="DefinitionObjects"><chunks>
					<chunk name="Object" index="0">
						<items><item name="GUID">scribble-type</item><item name="Name">Scribble</item></items>
						<chunks><chunk name="Container"><items>
							<item name="InstanceGuid">scribble-instance</item>
							<item name="NickName">Scribble</item>
							<item name="Bold">false</item>
							<item name="Italic">true</item>
							<item name="Font">Arial</item>
							<item name="Size">18</item>
							<item name="Text">Sinuous interlocking seam</item>
							<item name="Ca" type_name="gh_drawing_pointf"><X>660</X><Y>20</Y></item>
							<item name="Cb" type_name="gh_drawing_pointf"><X>1118.2617</X><Y>20</Y></item>
							<item name="Cc" type_name="gh_drawing_pointf"><X>1118.2617</X><Y>36.89258</Y></item>
							<item name="Cd" type_name="gh_drawing_pointf"><X>660</X><Y>36.89258</Y></item>
						</items></chunk></chunks>
					</chunk>
				</chunks></chunk></chunks></chunk></chunks>
			</Archive>`;

		const scribble = buildGhJson(xml).components.Scribble;

		expect(scribble.value).toEqual({
			type: "scribble",
			text: "Sinuous interlocking seam",
			font: "Arial",
			size: 18,
			bold: false,
			italic: true,
			corners: {
				a: { x: 660, y: 20 },
				b: { x: 1118.2617, y: 20 },
				c: { x: 1118.2617, y: 36.89258 },
				d: { x: 660, y: 36.89258 },
			},
		});
	});
});
