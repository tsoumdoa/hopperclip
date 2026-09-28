// @vitest-environment happy-dom
import { act, useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";
import { button, click, render } from "@/test/render";
import { ShareDialog } from "./gh-card-dialog";

const { createShare, revokeShare, success, error } = vi.hoisted(() => ({
	createShare: vi.fn(),
	revokeShare: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
}));
vi.mock("convex/react", () => ({
	useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
		getFunctionName(reference) === "ghCard:createShare"
			? createShare
			: revokeShare,
}));
vi.mock("@/env", () => ({
	env: { VITE_HOSTING_DOMAIN: "https://example.com" },
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

const result = {
	shareToken: "abcdefghij",
	expiryDate: "2030-01-01T00:00:00.000Z",
};
function Harness() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button onClick={() => setOpen(true)}>Share</button>
			<ShareDialog
				open={open}
				setOpen={setOpen}
				postId={"post-1" as Id<"post">}
			/>
		</>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	createShare.mockReset().mockResolvedValue(result);
	revokeShare.mockReset().mockResolvedValue(undefined);
});

test("a failed creation stops until Retry is clicked", async () => {
	createShare.mockRejectedValueOnce(new Error("Offline"));
	await render(<Harness />);
	await click(button("Share"));
	expect(createShare).toHaveBeenCalledTimes(1);
	expect(error).toHaveBeenCalledTimes(1);
	await click(button("Retry"));
	expect(createShare).toHaveBeenCalledTimes(2);
	expect(document.querySelector("input")?.value).toBe(
		"https://example.com/share?token=abcdefghij"
	);
});

test("revoking then reopening creates a fresh share session", async () => {
	await render(<Harness />);
	await click(button("Share"));
	await click(button("Revoke link"));
	expect(revokeShare).toHaveBeenCalledWith({ shareToken: result.shareToken });
	expect(createShare).toHaveBeenCalledTimes(1);
	expect(document.body.textContent).toContain("The link has been revoked");
	await click(button("Done"));
	createShare.mockResolvedValueOnce({ ...result, shareToken: "0123456789" });
	await click(button("Share"));
	expect(createShare).toHaveBeenCalledTimes(2);
	expect(document.querySelector("input")?.value).toContain("0123456789");
});

test("a late result from a closed session cannot overwrite a reopened dialog", async () => {
	let resolve!: (value: typeof result) => void;
	createShare.mockReturnValueOnce(
		new Promise<typeof result>((done) => {
			resolve = done;
		})
	);
	await render(<Harness />);
	await click(button("Share"));
	await click(button("Done"));
	createShare.mockResolvedValueOnce({ ...result, shareToken: "0123456789" });
	await click(button("Share"));
	await act(async () => resolve(result));
	expect(document.querySelector("input")?.value).toContain("0123456789");
});

test("a late failure after closing does not show an error toast", async () => {
	let reject!: (reason: Error) => void;
	createShare.mockReturnValueOnce(
		new Promise((_, fail) => {
			reject = fail;
		})
	);
	await render(<Harness />);
	await click(button("Share"));
	await click(button("Done"));
	await act(async () => reject(new Error("Offline")));
	expect(error).not.toHaveBeenCalled();
});

test("clipboard failure is reported without claiming the link was copied", async () => {
	vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
		new Error("Denied")
	);
	await render(<Harness />);
	await click(button("Share"));
	await click(button("Copy link"));
	expect(success).not.toHaveBeenCalled();
	expect(error).toHaveBeenCalledWith(
		"Failed to copy share link. Please try again."
	);
	expect(button("Copy link")).toBeDefined();
});
