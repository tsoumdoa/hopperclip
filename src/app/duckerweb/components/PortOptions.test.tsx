import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PortLabel } from "./PortOptions";

describe("PortLabel", () => {
	test("renders combinable mapping, simplify, reverse, and expression badges", () => {
		const html = renderToStaticMarkup(
			<PortLabel
				port={{
					id: "component.input",
					label: "Num",
					options: {
						mapping: "flatten",
						simplify: true,
						reverse: true,
						expression: "x * 2",
					},
				}}
				align="left"
			/>
		);

		expect(html).toContain('data-port-option="flatten"');
		expect(html).toContain('data-port-option="simplify"');
		expect(html).toContain("lucide-grasshopper-simplify");
		expect(html).toContain('data-port-option="reverse"');
		expect(html).toContain('data-port-option="expression"');
		expect(html).toContain("Expression: x * 2");
	});

	test("renders graft independently of flatten", () => {
		const html = renderToStaticMarkup(
			<PortLabel
				port={{
					id: "component.output",
					label: "Result",
					options: { mapping: "graft", simplify: true },
				}}
				align="right"
			/>
		);

		expect(html).toContain('data-port-option="graft"');
		expect(html).toContain('data-port-option="simplify"');
		expect(html).not.toContain('data-port-option="flatten"');
		expect(html).toContain("w-full");
		expect(html).toContain("justify-end");
	});

	test("renders reparameterize and unitize badges", () => {
		const html = renderToStaticMarkup(
			<PortLabel
				port={{
					id: "component.output",
					label: "V",
					options: { reparameterize: true, unitize: true },
				}}
				align="right"
			/>
		);

		expect(html).toContain('data-port-option="reparameterize"');
		expect(html).toContain('data-port-option="unitize"');
		expect(html).toContain("Reparameterize · Unitize");
		expect(html).toContain("lucide-grasshopper-transform");
		expect(html).not.toContain("linear-gradient");
		expect(html).not.toContain("shadow-");
	});

	test("renders legacy reparametrize mapping as a reparameterize badge", () => {
		const html = renderToStaticMarkup(
			<PortLabel
				port={{
					id: "component.input",
					label: "C",
					options: { mapping: "reparametrize" },
				}}
				align="left"
			/>
		);

		expect(html).toContain('data-port-option="reparameterize"');
		expect(html).toContain('title="Reparameterize"');
	});
});
