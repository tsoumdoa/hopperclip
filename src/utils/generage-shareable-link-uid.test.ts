import { describe, expect, test } from "vitest";
import { ShareLinkUidSchema } from "../types/types";
import { generateSharableLinkUid } from "./generage-shareable-link-uid";

describe("share tokens", () => {
	test("new tokens use 15 lowercase alphanumeric characters and pass the shared validator", () => {
		const token = generateSharableLinkUid();
		expect(token).toMatch(/^[a-z0-9]{15}$/);
		expect(ShareLinkUidSchema.parse(token)).toBe(token);
	});

	test.each([
		"abcdefghij",
		"0123456789",
		"abcdefghijklmno",
		"abcdefghijklmnopqrstuvwxyz".slice(0, 25),
	])("accepts an existing or new token: %s", (token) => {
		expect(ShareLinkUidSchema.parse(token)).toBe(token);
	});

	test.each([
		"",
		"a".repeat(9),
		"a".repeat(11),
		"a".repeat(14),
		"a".repeat(16),
		"a".repeat(24),
		"a".repeat(26),
		"A".repeat(25),
		"A".repeat(15),
		"a".repeat(14) + "_",
		"a".repeat(14) + "-",
		"a".repeat(14) + "/",
		"a".repeat(15) + "\n",
		"a".repeat(24) + "_",
		"a".repeat(24) + "-",
		"a".repeat(24) + "/",
		"a".repeat(25) + "\n",
		"a".repeat(10) + "\n",
		null,
		undefined,
		1234567890,
	])("rejects malformed token %j", (token) => {
		expect(ShareLinkUidSchema.safeParse(token).success).toBe(false);
	});
});
