import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

async function list(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? list(resolve(directory, entry.name))
          : resolve(directory, entry.name),
      ),
    )
  ).flat();
}
const files = await list(resolve("dist"));
let js = 0,
  fonts = 0,
  voice = 0,
  transfer = 0;
for (const file of files) {
  const size = /\.(js|css|html)$/.test(file)
    ? gzipSync(await readFile(file)).length
    : (await stat(file)).size;
  if (file.endsWith(".js")) js += size;
  if (file.endsWith(".woff2")) fonts += size;
  // Voice clips stream one at a time when a line is read aloud, so they are not part of the page load.
  if (/[\\/]voice[\\/]/.test(file)) voice += size;
  else transfer += size;
}
const report = {
  jsGzipBytes: js,
  fontBytes: fonts,
  totalEstimatedTransferBytes: transfer,
  voiceBytes: voice,
};
console.log("Production asset budget:", report);
if (js > 450 * 1024 || fonts > 80 * 1024 || transfer > 2 * 1024 * 1024 || voice > 2 * 1024 * 1024)
  throw new Error("Production payload exceeds the agreed budget");
