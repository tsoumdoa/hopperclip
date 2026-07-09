import { describe, expect, test } from "vitest";
import fs from "node:fs";
import pako from "pako";
import {
	GhFileError,
	detectGhFileKind,
	ghFileToGhXml,
	ghXmlToGhFile,
} from "./gh-file";

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
