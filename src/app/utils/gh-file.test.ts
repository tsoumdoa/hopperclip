import { describe, expect, test } from "vitest";
import fs from "node:fs";
import pako from "pako";
import { GhFileError, detectGhFileKind, ghFileToGhXml } from "./gh-file";
import { validateGhXml } from "./gh-xml";
import {
	GhSizeError,
	grasshopperBinaryToXml,
	inflateGrasshopperBinary,
} from "./gh-binary";
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
	const writeFloat64 = (value: number) => {
		const buffer = new ArrayBuffer(8);
		new DataView(buffer).setFloat64(0, value, true);
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
		| { kind: "doublearray"; values: number[] }
		| { kind: "version"; major: number; minor: number; revision: number }
		| { kind: "guid"; value: string }
		| { kind: "pointf"; x: number; y: number }
		| { kind: "size"; w: number; h: number }
		| { kind: "sizef"; w: number; h: number }
		| { kind: "point2d"; x: number; y: number }
		| { kind: "point3d"; x: number; y: number; z: number }
		| { kind: "point4d"; x: number; y: number; z: number; w: number }
		| { kind: "rectanglef"; x: number; y: number; w: number; h: number }
		| { kind: "interval1d"; a: number; b: number }
		| { kind: "interval2d"; au: number; bu: number; av: number; bv: number }
		| {
				kind: "line";
				ax: number;
				ay: number;
				az: number;
				bx: number;
				by: number;
				bz: number;
		  }
		| {
				kind: "plane";
				ox: number;
				oy: number;
				oz: number;
				xx: number;
				xy: number;
				xz: number;
				yx: number;
				yy: number;
				yz: number;
		  }
		| {
				kind: "boundingbox";
				minX: number;
				minY: number;
				minZ: number;
				maxX: number;
				maxY: number;
				maxZ: number;
		  };
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
			case 21: {
				const value = item.value as { kind: "doublearray"; values: number[] };
				writeInt32(value.values.length);
				value.values.forEach(writeFloat64);
				break;
			}
			case 31: {
				const value = item.value as { kind: "pointf"; x: number; y: number };
				writeFloat32(value.x);
				writeFloat32(value.y);
				break;
			}
			case 32: {
				const value = item.value as { kind: "size"; w: number; h: number };
				writeInt32(value.w);
				writeInt32(value.h);
				break;
			}
			case 33: {
				const value = item.value as { kind: "sizef"; w: number; h: number };
				writeFloat32(value.w);
				writeFloat32(value.h);
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
			case 51: {
				const value = item.value as {
					kind: "point3d";
					x: number;
					y: number;
					z: number;
				};
				writeFloat64(value.x);
				writeFloat64(value.y);
				writeFloat64(value.z);
				break;
			}
			case 50: {
				const value = item.value as { kind: "point2d"; x: number; y: number };
				writeFloat64(value.x);
				writeFloat64(value.y);
				break;
			}
			case 52: {
				const value = item.value as {
					kind: "point4d";
					x: number;
					y: number;
					z: number;
					w: number;
				};
				writeFloat64(value.x);
				writeFloat64(value.y);
				writeFloat64(value.z);
				writeFloat64(value.w);
				break;
			}
			case 60: {
				const value = item.value as {
					kind: "interval1d";
					a: number;
					b: number;
				};
				writeFloat64(value.a);
				writeFloat64(value.b);
				break;
			}
			case 61: {
				const value = item.value as {
					kind: "interval2d";
					au: number;
					bu: number;
					av: number;
					bv: number;
				};
				writeFloat64(value.au);
				writeFloat64(value.bu);
				writeFloat64(value.av);
				writeFloat64(value.bv);
				break;
			}
			case 70: {
				const value = item.value as {
					kind: "line";
					ax: number;
					ay: number;
					az: number;
					bx: number;
					by: number;
					bz: number;
				};
				writeFloat64(value.ax);
				writeFloat64(value.ay);
				writeFloat64(value.az);
				writeFloat64(value.bx);
				writeFloat64(value.by);
				writeFloat64(value.bz);
				break;
			}
			case 71: {
				const value = item.value as {
					kind: "boundingbox";
					minX: number;
					minY: number;
					minZ: number;
					maxX: number;
					maxY: number;
					maxZ: number;
				};
				writeFloat64(value.minX);
				writeFloat64(value.minY);
				writeFloat64(value.minZ);
				writeFloat64(value.maxX);
				writeFloat64(value.maxY);
				writeFloat64(value.maxZ);
				break;
			}
			case 72: {
				const value = item.value as {
					kind: "plane";
					ox: number;
					oy: number;
					oz: number;
					xx: number;
					xy: number;
					xz: number;
					yx: number;
					yy: number;
					yz: number;
				};
				writeFloat64(value.ox);
				writeFloat64(value.oy);
				writeFloat64(value.oz);
				writeFloat64(value.xx);
				writeFloat64(value.xy);
				writeFloat64(value.xz);
				writeFloat64(value.yx);
				writeFloat64(value.yy);
				writeFloat64(value.yz);
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
			{
				name: "Doubles",
				typeCode: 21,
				value: { kind: "doublearray", values: [1.25, -2.5] },
			},
			{
				name: "IntegerSize",
				typeCode: 32,
				value: { kind: "size", w: 640, h: 480 },
			},
			{
				name: "FloatSize",
				typeCode: 33,
				value: { kind: "sizef", w: 12.5, h: 7.25 },
			},
			{
				name: "Point2D",
				typeCode: 50,
				value: { kind: "point2d", x: 1.5, y: -2.5 },
			},
			{
				name: "Point4D",
				typeCode: 52,
				value: { kind: "point4d", x: 1, y: 2, z: 3, w: 4 },
			},
			{
				name: "Bounds",
				typeCode: 71,
				value: {
					kind: "boundingbox",
					minX: -1,
					minY: -2,
					minZ: -3,
					maxX: 4,
					maxY: 5,
					maxZ: 6,
				},
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
											{
												name: "Plane",
												typeCode: 72,
												value: {
													kind: "plane",
													ox: 0,
													oy: 0,
													oz: 0,
													xx: 1,
													xy: 0,
													xz: 0,
													yx: 0,
													yy: 1,
													yz: 0,
												},
											},
											{
												name: "Coordinate",
												typeCode: 51,
												value: { kind: "point3d", x: 1, y: 2, z: 3 },
											},
											{
												name: "Domain",
												typeCode: 60,
												value: { kind: "interval1d", a: 0, b: 10 },
											},
											{
												name: "Size",
												typeCode: 61,
												value: {
													kind: "interval2d",
													au: 0,
													bu: 20,
													av: 0,
													bv: 5,
												},
											},
											{
												name: "Line",
												typeCode: 70,
												value: {
													kind: "line",
													ax: 0,
													ay: 0,
													az: 0,
													bx: 10,
													by: 10,
													bz: 0,
												},
											},
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
	test("detects supported extensions and rejects others", () => {
		expect(detectGhFileKind(fileFromBytes(new Uint8Array(), "foo.gh"))).toBe(
			"gh"
		);
		expect(detectGhFileKind(fileFromBytes(new Uint8Array(), "FOO.GHX"))).toBe(
			"ghx"
		);
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

		expect(xml).toContain('<chunk name="Clipboard">');
		expect(xml).not.toContain('<chunk name="Definition">');
		expect(xml).toContain(
			'<item name="Plane" type_name="gh_plane" type_code="72">'
		);
		expect(xml).toContain(
			'<stream length="2">AAAAAAAA9D8AAAAAAAAEwA==</stream>'
		);
		expect(xml).toContain("<W>640</W>");
		expect(xml).toContain(
			'<item name="Bounds" type_name="gh_boundingbox" type_code="71">'
		);
		expect(xml).toContain("<MaxZ>6</MaxZ>");
		expect(validateGhXml(xml).isValid).toBe(true);

		const parsed = buildGhJson(xml, { includeVisuals: true });
		expect(parsed.components.NATIVE?.type).toBe("Native Component");
		expect(parsed.components.NATIVE?.visuals?.pivot).toEqual({ x: 60, y: 42 });
		expect(parsed.metadata?.pluginVersion).toBe("1.0.8");
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
});

function createNativeArchiveWriter() {
	const bytes: number[] = [];
	const encoder = new TextEncoder();

	const writeByte = (value: number) => bytes.push(value & 0xff);
	const writeInt32 = (value: number) => {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, true);
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
	const writeChunk = (
		name: string,
		index: number,
		itemCount: number,
		chunkCount: number
	) => {
		writeString(name);
		writeInt32(index);
		writeInt32(itemCount);
		writeInt32(chunkCount);
	};

	return {
		bytes,
		writeByte,
		writeInt32,
		writeString,
		writeChunk,
		finish: () => new Uint8Array(bytes),
	};
}

describe("grasshopperBinaryToXml", () => {
	test("rejects truncated native archives", () => {
		expect(() =>
			grasshopperBinaryToXml(new Uint8Array([0x01, 0x02, 0x03]))
		).toThrow(/Unexpected end|Invalid Grasshopper binary/);
	});

	test("rejects deeply nested chunk trees", () => {
		const writer = createNativeArchiveWriter();
		writer.writeChunk("Root", -1, 0, 1);
		for (let depth = 0; depth < 129; depth += 1) {
			writer.writeChunk(`Depth${depth}`, -1, 0, depth === 128 ? 0 : 1);
		}
		expect(() => grasshopperBinaryToXml(writer.finish())).toThrow(
			/Maximum chunk nesting depth exceeded/
		);
	});

	test("rejects unsupported item type codes", () => {
		const writer = createNativeArchiveWriter();
		writer.writeChunk("Root", -1, 1, 0);
		writer.writeString("BadItem");
		writer.writeInt32(-1);
		writer.writeInt32(999);
		expect(() => grasshopperBinaryToXml(writer.finish())).toThrow(
			/Unsupported Grasshopper binary item type 999/
		);
	});

	test("accepts terminal 7-bit payload 0x07 at the fifth byte", () => {
		const writer = createNativeArchiveWriter();
		writer.writeByte(0x80);
		writer.writeByte(0x80);
		writer.writeByte(0x80);
		writer.writeByte(0x80);
		writer.writeByte(0x07);
		expect(() => grasshopperBinaryToXml(writer.finish())).not.toThrow(
			/Invalid Grasshopper binary string length/
		);
	});

	test("rejects terminal 7-bit payloads exceeding 0x07 at the fifth byte", () => {
		for (const terminalPayload of [0x08, 0x10]) {
			const writer = createNativeArchiveWriter();
			writer.writeByte(0x80);
			writer.writeByte(0x80);
			writer.writeByte(0x80);
			writer.writeByte(0x80);
			writer.writeByte(terminalPayload);
			expect(() => grasshopperBinaryToXml(writer.finish())).toThrow(
				/Invalid Grasshopper binary string length/
			);
		}
	});

	test("rejects negative chunk counts", () => {
		const writer = createNativeArchiveWriter();
		writer.writeChunk("Root", -1, -1, 0);
		expect(() => grasshopperBinaryToXml(writer.finish())).toThrow(
			/Invalid Grasshopper binary chunk counts/
		);
	});

	test("throws GhSizeError when XML output exceeds the cap", () => {
		const bytes = nativeGhArchiveBytes();
		expect(() => grasshopperBinaryToXml(bytes, 16)).toThrow(GhSizeError);
	});
});

describe("inflateGrasshopperBinary", () => {
	test("throws GhSizeError when decompressed output exceeds the cap", () => {
		const inflated = nativeGhArchiveBytes();
		const compressed = pako.deflateRaw(inflated);
		expect(() => inflateGrasshopperBinary(compressed.buffer, 16)).toThrow(
			GhSizeError
		);
	});
});

describe("ghFileToGhXml size guards", () => {
	test("rejects oversized native .gh archives before inflation", async () => {
		const oversized = new Uint8Array(26 * 1024 * 1024);
		oversized[0] = 0x78;
		const file = fileFromBytes(oversized, "huge.gh");
		await expect(ghFileToGhXml(file)).rejects.toMatchObject({
			kind: "too-large",
		});
	});
});
