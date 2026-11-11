// Development-only evidence collection. Serves the static build with gzip,
// then uses an isolated Chromium profile; it is not a game backend.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const server = createServer(async (request, response) => {
  try {
    const name = new URL(request.url, "http://localhost").pathname;
    const path = resolve(
      root,
      "." + (name === "/" ? "/index.html" : decodeURIComponent(name)),
    );
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const bytes = await readFile(path);
    const extension = extname(path);
    const compress =
      /\.(js|css|html)$/.test(path) &&
      request.headers["accept-encoding"]?.includes("gzip");
    response.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".glb": "model/gltf-binary",
        ".woff2": "font/woff2",
      }[extension] ?? "application/octet-stream",
    );
    response.setHeader(
      "Cache-Control",
      extension === ".html" ? "no-cache" : "public, max-age=3600",
    );
    if (compress) response.setHeader("Content-Encoding", "gzip");
    response.end(compress ? gzipSync(bytes) : bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(4174, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true }).catch((error) => {
  server.close();
  throw error;
});
const report = {
  browser: browser.version(),
  environment:
    "Isolated headless Chromium on local macOS; not a real-phone or GPU-fps certification",
  cold: [],
  warm: [],
};
const baseUrl = "http://127.0.0.1:4174/?diagnostics";
const ready = (page) =>
  page
    .getByRole("button", { name: "Start shift 3" })
    .waitFor()
    .then(() =>
      page.waitForFunction(
        () => !document.querySelector(".menu-button.primary")?.disabled,
      ),
    );
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
async function completeCrewPlan(page, first = false) {
  if (first) {
    await click(page, "Start shift 3");
    await click(page, "Begin");
  } else await click(page, "Try another plan");
  await click(page, "Select research crate");
  await click(page, "Rotate");
  await page.locator('[data-cell="0"]').click();
  await click(page, "Select battery");
  await page.locator('[data-cell="6"]').click();
  await click(page, "Run shift 3");
  await click(page, "Continue to shift 4");
  await page.getByRole("button", { name: /Top route/ }).click();
  await page.getByRole("button", { name: /Power the fan/ }).click();
  await page.getByRole("button", { name: /Move crew to shelter/ }).click();
  await click(page, "Run shift 4");
  await click(page, "Continue to shift 5");
  await page.getByRole("button", { name: /Care for garden/ }).click();
  await click(page, "Run shift 5");
  await click(page, "See mission summary");
}
async function metrics(page, cdp) {
  await cdp.send("HeapProfiler.collectGarbage");
  const raw = await cdp.send("Performance.getMetrics");
  return {
    ...(await page.evaluate(() => window.__moonshiftMetrics)),
    heapBytes: raw.metrics.find((value) => value.name === "JSHeapUsedSize")
      ?.value,
  };
}
try {
  for (let index = 0; index < 3; index++) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 10_000_000 / 8,
      uploadThroughput: 2_000_000 / 8,
    });
    const started = performance.now();
    await page.goto(baseUrl);
    await ready(page);
    report.cold.push({
      milliseconds: Math.round(performance.now() - started),
      ...(await page.evaluate(() => ({
        transferBytes: performance
          .getEntriesByType("resource")
          .reduce((sum, entry) => sum + entry.transferSize, 0),
        domContentLoadedMs: Math.round(
          performance.getEntriesByType("navigation")[0]
            .domContentLoadedEventEnd,
        ),
      }))),
    });
    const warmStarted = performance.now();
    await page.reload();
    await ready(page);
    report.warm.push({
      milliseconds: Math.round(performance.now() - warmStarted),
    });
    if (index === 2) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      const stressStarted = performance.now();
      await page.reload();
      await ready(page);
      report.cpuStress4xMilliseconds = Math.round(
        performance.now() - stressStarted,
      );
    }
    await context.close();
  }
  console.log("Loading checks complete:", report.cold, report.warm);
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  await context.addInitScript(() =>
    localStorage.setItem(
      "moonshift-preferences",
      JSON.stringify({ reducedMotion: true, lowGraphics: false }),
    ),
  );
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  let modelRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) modelRequests++;
  });
  await page.goto(baseUrl);
  await ready(page);
  report.graphicsBackend = await page.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  });
  await completeCrewPlan(page, true);
  await page.waitForTimeout(400);
  report.warmedSummary = await metrics(page, cdp);
  for (let i = 0; i < 20; i++) {
    await completeCrewPlan(page);
    if ((i + 1) % 5 === 0) console.log(`Completed ${i + 1} replay checks.`);
  }
  await page.waitForTimeout(400);
  report.after20Replays = await metrics(page, cdp);
  report.modelRequests = modelRequests;
  await click(page, "Try another plan");
  await page.waitForTimeout(400);
  const beforeIdle = await page.evaluate(() => window.__moonshiftMetrics.frame);
  await page.waitForTimeout(10000);
  report.idleFrameDelta = await page.evaluate(
    (before) => window.__moonshiftMetrics.frame - before,
    beforeIdle,
  );
  await page.evaluate(() =>
    document
      .querySelector("canvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      ?.loseContext(),
  );
  await page.getByRole("button", { name: "Retry 3D" }).waitFor();
  await click(page, "Retry 3D");
  await page.waitForFunction(
    () =>
      !document.querySelector(".scene-error") &&
      document.querySelector("canvas"),
  );
  await page.getByRole("button", { name: "Select research crate" }).waitFor();
  report.contextRecoveryFood = await page.getByTestId("food-count").innerText();
  report.contextRecovery = "Recovered with the same committed Shift 3 snapshot";
  await page.waitForFunction(
    () =>
      !document.querySelector('[aria-label="Select research crate"]')?.disabled,
  );
  await page.screenshot({
    path: "/tmp/moonshift-final-desktop.png",
    fullPage: true,
  });
  await click(page, "Select research crate");
  await click(page, "Rotate");
  await page.locator('[data-cell="0"]').click();
  await click(page, "Select battery");
  await page.locator('[data-cell="6"]').click();
  await click(page, "Run shift 3");
  await click(page, "Continue to shift 4");
  await click(page, "Pause game");
  await click(page, "Settings");
  await page.getByRole("checkbox", { name: /Reduced motion/ }).uncheck();
  await click(page, "Done");
  await click(page, "Resume");
  await page.evaluate(() => {
    window.__frameSamples = [];
    window.__collectFrames = true;
    let previous = window.__moonshiftMetrics.renderedAt;
    const sample = () => {
      const current = window.__moonshiftMetrics.renderedAt;
      if (current !== previous) {
        const elapsed = current - previous;
        // Long idle gaps between distinct interactions are not active frames.
        if (elapsed < 100) window.__frameSamples.push(elapsed);
        previous = current;
      }
      if (window.__collectFrames) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (let i = 0; i < 40; i++) {
    await click(page, ["Garden", "Radio", "Shelter", "Storage"][i % 4]);
    await page.waitForTimeout(750);
  }
  report.activeFrameCallbacks = await page.evaluate(() => {
    window.__collectFrames = false;
    const samples = window.__frameSamples.sort((a, b) => a - b);
    return {
      samples: samples.length,
      medianMs: samples[Math.floor(samples.length / 2)],
      p95Ms: samples[Math.floor(samples.length * 0.95)],
      caveat:
        "Headless render callback intervals, excluding idle gaps; not GPU presentation times or mobile hardware performance",
    };
  });
  await context.close();
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
  });
  const phonePage = await phone.newPage();
  await phonePage.goto(baseUrl);
  await ready(phonePage);
  await phonePage.screenshot({
    path: "/tmp/moonshift-final-phone-title.png",
    fullPage: true,
  });
  await click(phonePage, "Start shift 3");
  await click(phonePage, "Begin");
  await phonePage.screenshot({
    path: "/tmp/moonshift-final-phone-game.png",
    fullPage: true,
  });
  report.phoneLayoutMetrics = await phonePage.evaluate(
    () => window.__moonshiftMetrics,
  );
  await phone.close();
  await writeFile(
    "/tmp/moonshift-performance.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
