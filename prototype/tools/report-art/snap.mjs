// Renders the game's own GLB models to transparent images for the mission report (run with `vite` on :5199).
// Usage: node tools/report-art/snap.mjs '[["out.webp", "id=radio&ry=-0.6"], ...]'
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const jobs = JSON.parse(process.argv[2]);
const b = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 800, height: 800 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
for (const [out, q] of jobs) {
  await p.goto("http://127.0.0.1:5199/tools/report-art/render.html?" + q);
  await p.waitForFunction(() => window.__done, null, { timeout: 30000 });
  const type = out.endsWith(".webp") ? "image/webp" : "image/png";
  const data = await p.evaluate((t) => document.getElementById("c").toDataURL(t, 0.86), type);
  writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
}
await b.close();
