import pako from "pako";
import { MAX_DECOMPRESSED_GH_XML_BYTES } from "@/types/types";

type GhValue =
	| string
	| number
	| boolean
	| bigint
	| Uint8Array
	| { kind: "version"; major: number; minor: number; revision: number }
	| { kind: "point"; x: number; y: number }
	| { kind: "pointf"; x: number; y: number }
	| { kind: "point3d"; x: number; y: number; z: number }
	| { kind: "rectangle"; x: number; y: number; width: number; height: number }
	| {
			kind: "rectanglef";
			x: number;
			y: number;
			width: number;
			height: number;
	  }
	| { kind: "color"; alpha: number; red: number; green: number; blue: number }
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
	  };

interface GhItem {
	name: string;
	index: number;
	typeCode: number;
	value: GhValue;
}

interface GhChunk {
	name: string;
	index: number;
	items: GhItem[];
	chunks: GhChunk[];
}

const TYPE_NAMES: Record<number, string> = {
	1: "gh_bool",
	2: "gh_byte",
	3: "gh_int32",
	4: "gh_int64",
	5: "gh_single",
	6: "gh_double",
	7: "gh_decimal",
	8: "gh_date",
	9: "gh_guid",
	10: "gh_string",
	20: "gh_bytearray",
	30: "gh_drawing_point",
	31: "gh_drawing_pointf",
	34: "gh_drawing_rectangle",
	35: "gh_drawing_rectanglef",
	36: "gh_drawing_color",
	37: "gh_bitmap",
	51: "gh_point3d",
	60: "gh_interval1d",
	61: "gh_interval2d",
	70: "gh_line",
	72: "gh_plane",
	80: "gh_version",
};

class GhBinaryReader {
	private offset = 0;

	constructor(private readonly bytes: Uint8Array) {}

	get done() {
		return this.offset === this.bytes.byteLength;
	}

	readChunk(): GhChunk {
		const name = this.readString();
		const index = this.readInt32();
		const itemCount = this.readInt32();
		const chunkCount = this.readInt32();

		const items: GhItem[] = [];
		for (let i = 0; i < itemCount; i += 1) {
			items.push(this.readItem());
		}

		const chunks: GhChunk[] = [];
		for (let i = 0; i < chunkCount; i += 1) {
			chunks.push(this.readChunk());
		}

		return { name, index, items, chunks };
	}

	private readItem(): GhItem {
		const name = this.readString();
		const index = this.readInt32();
		const typeCode = this.readInt32();

		return {
			name,
			index,
			typeCode,
			value: this.readValue(typeCode),
		};
	}

	private readValue(typeCode: number): GhValue {
		switch (typeCode) {
			case 1:
				return this.readByte() !== 0;
			case 2:
				return this.readByte();
			case 3:
				return this.readInt32();
			case 4:
			case 8:
				return this.readInt64();
			case 5:
				return this.readFloat32();
			case 6:
				return this.readFloat64();
			case 7:
				return this.readDecimal();
			case 9:
				return this.readGuid();
			case 10:
				return this.readString();
			case 20:
			case 37:
				return this.readByteArray();
			case 30:
				return {
					kind: "point",
					x: this.readInt32(),
					y: this.readInt32(),
				};
			case 31:
				return {
					kind: "pointf",
					x: this.readFloat32(),
					y: this.readFloat32(),
				};
			case 34:
				return {
					kind: "rectangle",
					x: this.readInt32(),
					y: this.readInt32(),
					width: this.readInt32(),
					height: this.readInt32(),
				};
			case 35:
				return {
					kind: "rectanglef",
					x: this.readFloat32(),
					y: this.readFloat32(),
					width: this.readFloat32(),
					height: this.readFloat32(),
				};
			case 36: {
				const blue = this.readByte();
				const green = this.readByte();
				const red = this.readByte();
				const alpha = this.readByte();
				return { kind: "color", alpha, red, green, blue };
			}
			case 51:
				return {
					kind: "point3d",
					x: this.readFloat64(),
					y: this.readFloat64(),
					z: this.readFloat64(),
				};
			case 60:
				return {
					kind: "interval1d",
					a: this.readFloat64(),
					b: this.readFloat64(),
				};
			case 61:
				return {
					kind: "interval2d",
					au: this.readFloat64(),
					bu: this.readFloat64(),
					av: this.readFloat64(),
					bv: this.readFloat64(),
				};
			case 70:
				return {
					kind: "line",
					ax: this.readFloat64(),
					ay: this.readFloat64(),
					az: this.readFloat64(),
					bx: this.readFloat64(),
					by: this.readFloat64(),
					bz: this.readFloat64(),
				};
			case 72:
				return {
					kind: "plane",
					ox: this.readFloat64(),
					oy: this.readFloat64(),
					oz: this.readFloat64(),
					xx: this.readFloat64(),
					xy: this.readFloat64(),
					xz: this.readFloat64(),
					yx: this.readFloat64(),
					yy: this.readFloat64(),
					yz: this.readFloat64(),
				};
			case 80:
				return {
					kind: "version",
					major: this.readInt32(),
					minor: this.readInt32(),
					revision: this.readInt32(),
				};
			default:
				throw new Error(`Unsupported Grasshopper binary item type ${typeCode}`);
		}
	}

	private readByte() {
		this.ensure(1);
		return this.bytes[this.offset++];
	}

	private readInt32() {
		this.ensure(4);
		const view = new DataView(
			this.bytes.buffer,
			this.bytes.byteOffset + this.offset,
			4
		);
		this.offset += 4;
		return view.getInt32(0, true);
	}

	private readUInt32() {
		this.ensure(4);
		const view = new DataView(
			this.bytes.buffer,
			this.bytes.byteOffset + this.offset,
			4
		);
		this.offset += 4;
		return view.getUint32(0, true);
	}

	private readInt64() {
		const low = BigInt(this.readUInt32());
		const high = BigInt(this.readInt32());
		return (high << 32n) | low;
	}

	private readFloat32() {
		this.ensure(4);
		const view = new DataView(
			this.bytes.buffer,
			this.bytes.byteOffset + this.offset,
			4
		);
		this.offset += 4;
		return view.getFloat32(0, true);
	}

	private readFloat64() {
		this.ensure(8);
		const view = new DataView(
			this.bytes.buffer,
			this.bytes.byteOffset + this.offset,
			8
		);
		this.offset += 8;
		return view.getFloat64(0, true);
	}

	private readDecimal() {
		const low = BigInt(this.readUInt32());
		const mid = BigInt(this.readUInt32());
		const high = BigInt(this.readUInt32());
		const flags = this.readUInt32();
		const scale = (flags >> 16) & 0x7f;
		const negative = (flags & 0x80000000) !== 0;
		const raw = (high << 64n) | (mid << 32n) | low;
		const digits = raw.toString().padStart(scale + 1, "0");
		const whole = digits.slice(0, digits.length - scale);
		const fraction = scale > 0 ? `.${digits.slice(-scale)}` : "";
		return `${negative ? "-" : ""}${whole}${fraction}`;
	}

	private readGuid() {
		this.ensure(16);
		const start = this.bytes.byteOffset + this.offset;
		const view = new DataView(this.bytes.buffer, start, 16);
		const tail = Array.from(this.bytes.slice(this.offset + 8, this.offset + 16))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		this.offset += 16;
		return [
			view.getUint32(0, true).toString(16).padStart(8, "0"),
			view.getUint16(4, true).toString(16).padStart(4, "0"),
			view.getUint16(6, true).toString(16).padStart(4, "0"),
			tail.slice(0, 4),
			tail.slice(4),
		].join("-");
	}

	private readByteArray() {
		const length = this.readInt32();
		if (length < 0) {
			throw new Error("Invalid Grasshopper binary byte array length");
		}
		this.ensure(length);
		const value = this.bytes.slice(this.offset, this.offset + length);
		this.offset += length;
		return value;
	}

	private readString() {
		const length = this.read7BitEncodedInt();
		this.ensure(length);
		const value = new TextDecoder("utf-8", { fatal: true }).decode(
			this.bytes.slice(this.offset, this.offset + length)
		);
		this.offset += length;
		return value;
	}

	private read7BitEncodedInt() {
		let count = 0;
		let shift = 0;

		for (;;) {
			const byte = this.readByte();
			count |= (byte & 0x7f) << shift;
			if ((byte & 0x80) === 0) return count;
			shift += 7;
			if (shift > 28) {
				throw new Error("Invalid Grasshopper binary string length");
			}
		}
	}

	private ensure(length: number) {
		if (this.offset + length > this.bytes.byteLength) {
			throw new Error("Unexpected end of Grasshopper binary archive");
		}
	}
}

function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatNumber(value: number) {
	if (Object.is(value, -0)) return "0";
	return String(value);
}

function bytesToBase64(bytes: Uint8Array) {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(bytes).toString("base64");
	}

	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
	}
	return btoa(binary);
}

function itemValueToXml(item: GhItem, indent: string) {
	const value = item.value;

	if (typeof value === "string") {
		return `${escapeXml(value)}`;
	}
	if (typeof value === "number") {
		return `${formatNumber(value)}`;
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "bigint") {
		return value.toString();
	}
	if (value instanceof Uint8Array) {
		return `\n${indent}  <stream length="${value.byteLength}">${bytesToBase64(
			value
		)}</stream>\n${indent}`;
	}

	switch (value.kind) {
		case "version":
			return `\n${indent}  <Major>${value.major}</Major>\n${indent}  <Minor>${value.minor}</Minor>\n${indent}  <Revision>${value.revision}</Revision>\n${indent}`;
		case "point":
		case "pointf":
			return `\n${indent}  <X>${formatNumber(value.x)}</X>\n${indent}  <Y>${formatNumber(value.y)}</Y>\n${indent}`;
		case "point3d":
			return `\n${indent}  <X>${formatNumber(value.x)}</X>\n${indent}  <Y>${formatNumber(value.y)}</Y>\n${indent}  <Z>${formatNumber(value.z)}</Z>\n${indent}`;
		case "rectangle":
		case "rectanglef":
			return `\n${indent}  <X>${formatNumber(value.x)}</X>\n${indent}  <Y>${formatNumber(value.y)}</Y>\n${indent}  <W>${formatNumber(value.width)}</W>\n${indent}  <H>${formatNumber(value.height)}</H>\n${indent}`;
		case "color":
			return `\n${indent}  <ARGB>${value.alpha};${value.red};${value.green};${value.blue}</ARGB>\n${indent}`;
		case "interval1d":
			return `\n${indent}  <A>${formatNumber(value.a)}</A>\n${indent}  <B>${formatNumber(value.b)}</B>\n${indent}`;
		case "interval2d":
			return `\n${indent}  <Au>${formatNumber(value.au)}</Au>\n${indent}  <Bu>${formatNumber(value.bu)}</Bu>\n${indent}  <Av>${formatNumber(value.av)}</Av>\n${indent}  <Bv>${formatNumber(value.bv)}</Bv>\n${indent}`;
		case "line":
			return `\n${indent}  <Ax>${formatNumber(value.ax)}</Ax>\n${indent}  <Ay>${formatNumber(value.ay)}</Ay>\n${indent}  <Az>${formatNumber(value.az)}</Az>\n${indent}  <Bx>${formatNumber(value.bx)}</Bx>\n${indent}  <By>${formatNumber(value.by)}</By>\n${indent}  <Bz>${formatNumber(value.bz)}</Bz>\n${indent}`;
		case "plane":
			return `\n${indent}  <Ox>${formatNumber(value.ox)}</Ox>\n${indent}  <Oy>${formatNumber(value.oy)}</Oy>\n${indent}  <Oz>${formatNumber(value.oz)}</Oz>\n${indent}  <Xx>${formatNumber(value.xx)}</Xx>\n${indent}  <Xy>${formatNumber(value.xy)}</Xy>\n${indent}  <Xz>${formatNumber(value.xz)}</Xz>\n${indent}  <Yx>${formatNumber(value.yx)}</Yx>\n${indent}  <Yy>${formatNumber(value.yy)}</Yy>\n${indent}  <Yz>${formatNumber(value.yz)}</Yz>\n${indent}`;
	}
}

function itemToXml(item: GhItem, depth: number) {
	const indent = "  ".repeat(depth);
	const typeName = TYPE_NAMES[item.typeCode] ?? "gh_unknown";
	const index = item.index >= 0 ? ` index="${item.index}"` : "";
	return `${indent}<item name="${escapeXml(item.name)}"${index} type_name="${typeName}" type_code="${item.typeCode}">${itemValueToXml(item, indent)}</item>`;
}

function chunkToXml(chunk: GhChunk, depth: number) {
	const indent = "  ".repeat(depth);
	const index = chunk.index >= 0 ? ` index="${chunk.index}"` : "";
	const lines = [`${indent}<chunk name="${escapeXml(chunk.name)}"${index}>`];

	if (chunk.items.length > 0) {
		lines.push(`${indent}  <items count="${chunk.items.length}">`);
		for (const item of chunk.items) {
			lines.push(itemToXml(item, depth + 2));
		}
		lines.push(`${indent}  </items>`);
	}

	if (chunk.chunks.length > 0) {
		lines.push(`${indent}  <chunks count="${chunk.chunks.length}">`);
		for (const child of chunk.chunks) {
			lines.push(chunkToXml(child, depth + 2));
		}
		lines.push(`${indent}  </chunks>`);
	}

	lines.push(`${indent}</chunk>`);
	return lines.join("\n");
}

function archiveToXml(root: GhChunk) {
	const lines = [
		'<?xml version="1.0" encoding="utf-8" standalone="yes"?>',
		`<Archive name="${escapeXml(root.name)}">`,
		"  <!--Grasshopper archive-->",
		"  <!--Grasshopper and GH_IO.dll are copyrighted by Robert McNeel & Associates-->",
		"  <!--Archive generated by GH_IO.dll file utility library {0.2.0002}-->",
	];

	if (root.items.length > 0) {
		lines.push(`  <items count="${root.items.length}">`);
		for (const item of root.items) {
			lines.push(itemToXml(item, 2));
		}
		lines.push("  </items>");
	}

	if (root.chunks.length > 0) {
		lines.push(`  <chunks count="${root.chunks.length}">`);
		for (const chunk of root.chunks) {
			lines.push(chunkToXml(chunk, 2));
		}
		lines.push("  </chunks>");
	}

	lines.push("</Archive>");
	return lines.join("\n");
}

export function inflateGrasshopperBinary(
	data: ArrayBuffer,
	maxBytes = MAX_DECOMPRESSED_GH_XML_BYTES
) {
	let inflated: Uint8Array;
	try {
		inflated = pako.inflateRaw(new Uint8Array(data));
	} catch (err) {
		throw new Error(
			`Failed to inflate native .gh archive: ${
				err instanceof Error ? err.message : String(err)
			}`
		);
	}

	if (inflated.byteLength > maxBytes) {
		throw new Error("GhXml is too large");
	}

	return inflated;
}

export function grasshopperBinaryToXml(bytes: Uint8Array) {
	const reader = new GhBinaryReader(bytes);
	const root = reader.readChunk();

	if (!reader.done) {
		throw new Error("Unexpected trailing bytes in Grasshopper binary archive");
	}

	return archiveToXml(root);
}
