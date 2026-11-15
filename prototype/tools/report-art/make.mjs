// Regenerates public/assets/report/*: crew portraits (one per visor expression) and item thumbnails.
import { execFileSync } from "node:child_process";
const out = "public/assets/report";
const jobs = [];
const crew = { a: -0.2, b: -0.5, c: -0.8 }; // left one turns right, right one turns left: they face each other a little
for (const [k, ry] of Object.entries(crew))
  for (const face of ["happy", "calm", "worried", "tired"])
    jobs.push([`${out}/crew-${k}-${face}.webp`, `id=crew-${k}&ry=${ry}&face=${face}&w=420&h=560&el=0.1&pad=1.0`]);
for (const id of ["radio", "food", "kit", "supply", "garden", "beep"])
  jobs.push([`${out}/${id}.webp`, `id=${id}&ry=-0.6&w=320&h=320&pad=0.95`]);
execFileSync("node", ["tools/report-art/snap.mjs", JSON.stringify(jobs)], { stdio: "inherit" });
// Trim the transparent margin so each picture fills its box (Pillow keeps webp alpha).
execFileSync("python3", ["-c", `
import glob
from PIL import Image
for f in glob.glob("${out}/*.webp"):
    im = Image.open(f).convert("RGBA")
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = 6
    box = (max(box[0]-pad,0), max(box[1]-pad,0), min(box[2]+pad, im.width), min(box[3]+pad, im.height))
    im = im.crop(box)
    im.save(f, "WEBP", quality=86, method=6)
    # Head-and-shoulders crops of the crew for the small story cards.
    if "/crew-b-" in f and ("calm" in f or "worried" in f) and "bust" not in f:
        im.crop((0, 0, im.width, int(im.height * 0.56))).save(f.replace(".webp", "-bust.webp"), "WEBP", quality=86, method=6)
`], { stdio: "inherit" });
