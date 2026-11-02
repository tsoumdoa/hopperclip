import { expect, test, vi } from "vitest";
import { PREVIEW_VERSION } from "@/types/preview";
import { savePreviewIfNeeded } from "./use-save-preview";

test("skips lookup and saving when a current preview is loaded", async () => {
	const getPreview = vi.fn();
	const save = vi.fn();
	await savePreviewIfNeeded(true, getPreview, save);
	expect(getPreview).not.toHaveBeenCalled();
	expect(save).not.toHaveBeenCalled();
});

test("saves without a lookup when the loaded preview is missing or outdated", async () => {
	const getPreview = vi.fn();
	const save = vi.fn().mockResolvedValue(undefined);
	await savePreviewIfNeeded(false, getPreview, save);
	expect(getPreview).not.toHaveBeenCalled();
	expect(save).toHaveBeenCalledOnce();
});

test("Off or loading does one lookup and skips building and saving a current preview", async () => {
	const getPreview = vi.fn().mockResolvedValue({ version: PREVIEW_VERSION });
	const save = vi.fn();
	await savePreviewIfNeeded(undefined, getPreview, save);
	expect(getPreview).toHaveBeenCalledOnce();
	expect(save).not.toHaveBeenCalled();
});

test.each([
	null,
	{ version: PREVIEW_VERSION - 1 },
	{ version: PREVIEW_VERSION + 1 },
])("saves an unknown preview after the lookup returns %s", async (preview) => {
	const getPreview = vi.fn().mockResolvedValue(preview);
	const save = vi.fn().mockResolvedValue(undefined);
	await savePreviewIfNeeded(undefined, getPreview, save);
	expect(getPreview).toHaveBeenCalledOnce();
	expect(save).toHaveBeenCalledOnce();
});

test("swallows a failed lookup without attempting to build or save", async () => {
	const getPreview = vi.fn().mockRejectedValue(new Error("Query failed"));
	const save = vi.fn();
	await expect(
		savePreviewIfNeeded(undefined, getPreview, save)
	).resolves.toBeUndefined();
	expect(save).not.toHaveBeenCalled();
});

test("swallows a failing mutation without rejecting", async () => {
	const save = vi.fn().mockRejectedValue(new Error("Mutation failed"));
	await expect(
		savePreviewIfNeeded(false, vi.fn(), save)
	).resolves.toBeUndefined();
	expect(save).toHaveBeenCalledOnce();
});

test("swallows a synchronous build failure without rejecting", async () => {
	const save = vi.fn(() => {
		throw new Error("Build failed");
	});
	await expect(
		savePreviewIfNeeded(false, vi.fn(), save)
	).resolves.toBeUndefined();
});
