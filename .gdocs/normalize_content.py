import json
import glob
import os
import re

repl = {
    "04 Quests & Content": "03 Narrative & World",
    "07 Technical Design": "06 Technical Design",
    "08 Economy & Balance": "02 Gameplay & Systems",
    "01 Vision & Pillars": "01 Vision & Strategy",
    "09 UI / UX": "04 Experience: UX, UI, Audio",
    "10 Save & Persistence": "06 Technical Design",
    "12 Production": "07 Production & Launch",
    "03 Levels & World": "02 Gameplay & Systems",
    "05 Narrative": "03 Narrative & World",
    "03 Systems": "02 Gameplay & Systems",
    "06 UI": "04 Experience: UX, UI, Audio",
}


def fix(s):
    for a, b in repl.items():
        s = s.replace(a, b)
    return s


for f in sorted(glob.glob("content/*.json")):
    d = json.load(open(f, encoding="utf-8"))
    for blk in d["blocks"]:
        for k, v in list(blk.items()):
            if isinstance(v, str):
                blk[k] = fix(v)
            elif isinstance(v, list):
                if all(isinstance(x, str) for x in v):
                    blk[k] = [fix(x) for x in v]
                elif all(isinstance(x, list) for x in v):
                    blk[k] = [[fix(c) if isinstance(c, str) else c for c in row] for row in v]
        if blk.get("t") == "h2" and re.match(r"^\d+(\.\d+)?\s+Definition of done$", blk.get("x", "")):
            blk["x"] = "Definition of done"
        if blk.get("t") in ("h2", "h3") and re.match(r"^\d+(\.\d+)?\s+Open questions$", blk.get("x", "")):
            blk["t"] = "h2"
            blk["x"] = "Open questions"
    if f.endswith("09_appendix.json"):
        for blk in d["blocks"]:
            if blk.get("t") == "p":
                blk["x"] = blk["x"].replace(
                    "TBD hides a dependency", "A vague “to be decided” hides a dependency")
    open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print("normalized", os.path.basename(f))
