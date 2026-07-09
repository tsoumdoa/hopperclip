import { describe, expect, test } from "vitest";
import fs from "node:fs";
import pako from "pako";
import {
	GhFileError,
	detectGhFileKind,
	ghFileToGhXml,
	ghXmlToGhFile,
} from "./gh-file";
import { validateGhXml } from "./gh-xml";
import { buildGhJson } from "parser/src/parser";

const FIXTURE_XML = fs.readFileSync(
	"parser/sand/xmls/csharp-component.xml",
	"utf8"
);

function fileFromBytes(
	bytes: Uint8Array,
	name: string,
	type = "application/octet-stream"
): File {
	// jsdom/vitest may not always expose the File constructor with full
	// BlobPart typing; cast through unknown to satisfy TS without losing
	// runtime semantics.
	const blob = new Blob([bytes as BlobPart], { type });
	return new File([blob], name, { type });
}

function nativeGhArchiveBytes() {
	const bytes: number[] = [];
	const encoder = new TextEncoder();

	const writeByte = (value: number) => bytes.push(value & 0xff);
	const writeInt32 = (value: number) => {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, true);
		bytes.push(...new Uint8Array(buffer));
	};
	const writeFloat32 = (value: number) => {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setFloat32(0, value, true);
		bytes.push(...new Uint8Array(buffer));
	};
	const write7BitEncodedInt = (value: number) => {
		let current = value;
		while (current >= 0x80) {
			writeByte((current & 0x7f) | 0x80);
			current >>= 7;
		}
		writeByte(current);
	};
	const writeString = (value: string) => {
		const encoded = encoder.encode(value);
		write7BitEncodedInt(encoded.byteLength);
		bytes.push(...encoded);
	};
	const writeGuid = (value: string) => {
		const [a, b, c, d, e] = value.split("-");
		const tail = `${d}${e}`;
		const buffer = new ArrayBuffer(8);
		const view = new DataView(buffer);
		view.setUint32(0, Number.parseInt(a, 16), true);
		view.setUint16(4, Number.parseInt(b, 16), true);
		view.setUint16(6, Number.parseInt(c, 16), true);
		bytes.push(...new Uint8Array(buffer));
		for (let i = 0; i < tail.length; i += 2) {
			writeByte(Number.parseInt(tail.slice(i, i + 2), 16));
		}
	};

	type NativeValue =
		| string
		| number
		| boolean
		| { kind: "version"; major: number; minor: number; revision: number }
		| { kind: "guid"; value: string }
		| { kind: "pointf"; x: number; y: number }
		| { kind: "rectanglef"; x: number; y: number; w: number; h: number };
	type NativeItem = {
		name: string;
		index?: number;
		typeCode: number;
		value: NativeValue;
	};
	type NativeChunk = {
		name: string;
		index?: number;
		items?: NativeItem[];
		chunks?: NativeChunk[];
	};

	const writeItem = (item: NativeItem) => {
		writeString(item.name);
		writeInt32(item.index ?? -1);
		writeInt32(item.typeCode);
		switch (item.typeCode) {
			case 1:
				writeByte(item.value === true ? 1 : 0);
				break;
			case 3:
				writeInt32(item.value as number);
				break;
			case 9:
				writeGuid((item.value as { kind: "guid"; value: string }).value);
				break;
			case 10:
				writeString(item.value as string);
				break;
			case 31: {
				const value = item.value as { kind: "pointf"; x: number; y: number };
				writeFloat32(value.x);
				writeFloat32(value.y);
				break;
			}
			case 35: {
				const value = item.value as {
					kind: "rectanglef";
					x: number;
					y: number;
					w: number;
					h: number;
				};
				writeFloat32(value.x);
				writeFloat32(value.y);
				writeFloat32(value.w);
				writeFloat32(value.h);
				break;
			}
			case 80: {
				const value = item.value as {
					kind: "version";
					major: number;
					minor: number;
					revision: number;
				};
				writeInt32(value.major);
				writeInt32(value.minor);
				writeInt32(value.revision);
				break;
			}
			default:
				throw new Error(`Unsupported test item type ${item.typeCode}`);
		}
	};

	const writeChunk = (chunk: NativeChunk) => {
		const items = chunk.items ?? [];
		const chunks = chunk.chunks ?? [];
		writeString(chunk.name);
		writeInt32(chunk.index ?? -1);
		writeInt32(items.length);
		writeInt32(chunks.length);
		items.forEach(writeItem);
		chunks.forEach(writeChunk);
	};

	writeChunk({
		name: "Root",
		items: [
			{
				name: "ArchiveVersion",
				typeCode: 80,
				value: { kind: "version", major: 0, minor: 2, revision: 2 },
			},
		],
		chunks: [
			{
				name: "Definition",
				items: [
					{
						name: "plugin_version",
						typeCode: 80,
						value: { kind: "version", major: 1, minor: 0, revision: 8 },
					},
				],
				chunks: [
					{
						name: "DefinitionObjects",
						items: [{ name: "ObjectCount", typeCode: 3, value: 1 }],
						chunks: [
							{
								name: "Object",
								index: 0,
								items: [
									{
										name: "GUID",
										typeCode: 9,
										value: {
											kind: "guid",
											value: "11111111-2222-3333-4444-555555555555",
										},
									},
									{ name: "Name", typeCode: 10, value: "Native Component" },
								],
								chunks: [
									{
										name: "Container",
										items: [
											{
												name: "Description",
												typeCode: 10,
												value: "Decoded from native .gh binary",
											},
											{
												name: "InstanceGuid",
												typeCode: 9,
												value: {
													kind: "guid",
													value: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
												},
											},
											{ name: "Name", typeCode: 10, value: "Native Component" },
											{ name: "NickName", typeCode: 10, value: "NATIVE" },
										],
										chunks: [
											{
												name: "Attributes",
												items: [
													{
														name: "Bounds",
														typeCode: 35,
														value: {
															kind: "rectanglef",
															x: 10,
															y: 20,
															w: 100,
															h: 44,
														},
													},
													{
														name: "Pivot",
														typeCode: 31,
														value: { kind: "pointf", x: 60, y: 42 },
													},
													{ name: "Selected", typeCode: 1, value: true },
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		],
	});

	return new Uint8Array(bytes);
}

describe("detectGhFileKind", () => {
	test("detects .gh extension", () => {
		expect(detectGhFileKind(fileFromBytes(new Uint8Array(), "foo.gh"))).toBe(
			"gh"
		);
	});

	test("detects .ghx extension (case-insensitive)", () => {
		expect(detectGhFileKind(fileFromBytes(new Uint8Array(), "FOO.GHX"))).toBe(
			"ghx"
		);
	});

	test("returns unknown for other extensions", () => {
		expect(detectGhFileKind(fileFromBytes(new Uint8Array(), "foo.xml"))).toBe(
			"unknown"
		);
	});
});

describe("ghFileToGhXml", () => {
	test("decodes a gzipped .gh file back to its original XML", async () => {
		const gzipped = pako.gzip(FIXTURE_XML);
		const file = fileFromBytes(gzipped, "definition.gh");

		const xml = await ghFileToGhXml(file);

		expect(xml).toBe(FIXTURE_XML);
		// Sanity: it's actually the Grasshopper archive we expect
		expect(xml).toContain("<Archive");
		expect(xml).toContain('name="Root"');
	});

	test("decodes a plain .ghx XML file", async () => {
		const bytes = new TextEncoder().encode(FIXTURE_XML);
		const file = fileFromBytes(bytes, "definition.ghx", "application/xml");

		const xml = await ghFileToGhXml(file);

		expect(xml).toBe(FIXTURE_XML);
	});

	test("decodes a native raw-deflate .gh binary archive to GhXml", async () => {
		const file = fileFromBytes(
			pako.deflateRaw(nativeGhArchiveBytes()),
			"native.gh"
		);

		const xml = await ghFileToGhXml(file);

		expect(xml).toContain('<chunk name="Definition">');
		expect(xml).toContain("Native Component");
		expect(validateGhXml(xml).isValid).toBe(true);

		const parsed = buildGhJson(xml, { includeVisuals: true });
		expect(parsed.components.NATIVE?.type).toBe("Native Component");
		expect(parsed.components.NATIVE?.visuals?.pivot).toEqual({ x: 60, y: 42 });
	});

	test("rejects unknown extensions", async () => {
		const file = fileFromBytes(new Uint8Array(), "definition.xml");
		await expect(ghFileToGhXml(file)).rejects.toBeInstanceOf(GhFileError);
	});

	test("rejects empty files", async () => {
		const file = fileFromBytes(new Uint8Array(), "empty.gh");
		await expect(ghFileToGhXml(file)).rejects.toThrow(/empty/);
	});

	test("passes through plaintext bytes for non-gzipped .gh (downstream validateGhXml handles it)", async () => {
		// Existing decompress() returns plaintext bytes when the gzip magic is
		// absent. We preserve that behavior so validateGhXml stays the single
		// source of truth for XML validity — no duplicate error path.
		const file = fileFromBytes(
			new TextEncoder().encode("not a real grasshopper file"),
			"plaintext.gh"
		);
		const xml = await ghFileToGhXml(file);
		expect(xml).toBe("not a real grasshopper file");
	});

	test("wraps DecompressionStream errors when bytes claim to be gzip but are corrupt", async () => {
		// Start with the gzip magic bytes (0x1f 0x8b) followed by garbage so
		// the DecompressionStream path is taken, then fails on the bad payload.
		const corrupt = new Uint8Array([0x1f, 0x8b, 0x00, 0x00, 0xff, 0xff]);
		const file = fileFromBytes(corrupt, "corrupt.gh");
		await expect(ghFileToGhXml(file)).rejects.toBeInstanceOf(GhFileError);
	});

	test("round-trips XML -> .gh -> XML via ghXmlToGhFile + ghFileToGhXml", async () => {
		const blob = ghXmlToGhFile(FIXTURE_XML, "roundtrip.gh");
		const file = new File([blob], "roundtrip.gh");

		const xml = await ghFileToGhXml(file);

		expect(xml).toBe(FIXTURE_XML);
	});
});

describe("GhFileError", () => {
	test("carries the failure kind", () => {
		const err = new GhFileError("boom", "too-large");
		expect(err.name).toBe("GhFileError");
		expect(err.kind).toBe("too-large");
		expect(err.message).toBe("boom");
	});
});
