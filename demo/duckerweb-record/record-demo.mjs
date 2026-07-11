import { chromium } from "playwright";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
const ARTIFACTS_DIR = "/opt/cursor/artifacts";
const DEMO_GHX = path.join(ARTIFACTS_DIR, "demo-definition.ghx");
const SOURCE_XML = path.join(
	workspaceRoot,
	"parser/sand/xmls/csharp-component.xml"
);
const BASE_URL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4310/";

async function waitForServer(url, attempts = 40) {
	for (let i = 0; i < attempts; i += 1) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
		} catch {
			// retry
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`Server not ready at ${url}`);
}

async function showDropOverlay(page) {
	const zone = page.locator('[data-testid="duckerweb-main-zone"]');
	await zone.waitFor({ timeout: 10000 });

	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Input.dispatchDragEvent", {
		type: "dragEnter",
		x: 640,
		y: 360,
		data: {
			items: [{ mimeType: "application/octet-stream", data: "" }],
			dragOperationsMask: 1,
		},
	});

	try {
		await page.locator('[data-testid="duckerweb-drop-overlay"]').waitFor({
			timeout: 3000,
		});
		await page.waitForTimeout(1800);
	} catch {
		// Fall back to a short pause if the browser does not surface the overlay.
		await page.waitForTimeout(1200);
	}
}

async function main() {
	await mkdir(ARTIFACTS_DIR, { recursive: true });
	await copyFile(SOURCE_XML, DEMO_GHX);

	await waitForServer(BASE_URL);

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 720 },
		recordVideo: {
			dir: ARTIFACTS_DIR,
			size: { width: 1280, height: 720 },
		},
	});
	const page = await context.newPage();

	await page.goto(BASE_URL, { waitUntil: "networkidle" });
	await page.waitForTimeout(1200);

	await showDropOverlay(page);

	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(DEMO_GHX);

	await page.getByText("GhXml validated").waitFor({ timeout: 15000 });
	await page.waitForTimeout(1800);

	await page.getByRole("tab", { name: "Flow" }).click();
	await page.waitForTimeout(2200);

	await page.getByRole("tab", { name: "List" }).click();
	await page.waitForTimeout(1500);

	const video = page.video();
	await page.close();
	await context.close();
	await browser.close();

	if (!video) {
		throw new Error("Playwright did not record a video");
	}

	const rawVideoPath = await video.path();
	const finalVideoPath = path.join(ARTIFACTS_DIR, "duckerweb-dropzone-demo.webm");
	await copyFile(rawVideoPath, finalVideoPath);

	const mp4Path = path.join(ARTIFACTS_DIR, "duckerweb-dropzone-demo.mp4");
	const { spawn } = await import("node:child_process");
	await new Promise((resolve, reject) => {
		const ffmpeg = spawn(
			"ffmpeg",
			[
				"-y",
				"-i",
				finalVideoPath,
				"-c:v",
				"libx264",
				"-pix_fmt",
				"yuv420p",
				"-movflags",
				"+faststart",
				mp4Path,
			],
			{ stdio: "inherit" }
		);
		ffmpeg.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg exited with code ${code}`));
		});
	});

	console.log(
		JSON.stringify({
			webm: finalVideoPath,
			mp4: mp4Path,
			fixture: DEMO_GHX,
		})
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
