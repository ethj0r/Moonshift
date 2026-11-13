"""Merge per-section worked examples into the content JSON files.

Usage: python merge_examples.py
"""
import glob
import json
import os

FILES = {
    "01_vision.json": "examples_01.json",
    "02_gameplay.json": "examples_02.json",
    "03_narrative.json": "examples_03.json",
    "04_experience.json": "examples_04.json",
    "05_art.json": "examples_05.json",
    "06_technical.json": "examples_06.json",
    "07_production.json": "examples_07.json",
    "08_diagrams.json": "examples_08.json",
    "09_appendix.json": "examples_09.json",
}

for content_file, examples_file in FILES.items():
    cpath = os.path.join("content", content_file)
    epath = os.path.join("content", examples_file)
    if not os.path.exists(epath):
        print("missing", examples_file)
        continue
    data = json.load(open(cpath, encoding="utf-8"))
    examples = json.load(open(epath, encoding="utf-8"))["examples"]
    blocks = data["blocks"]
    out = []
    i = 0
    added = 0
    used = set()
    while i < len(blocks):
        b = blocks[i]
        out.append(b)
        if b.get("t") == "h2" and b.get("x") in examples:
            key = b["x"]
            # find the end of this section (next h2/h1)
            j = i + 1
            while j < len(blocks) and blocks[j].get("t") not in ("h1", "h2"):
                j += 1
            section = blocks[i + 1:j]
            if not any(x.get("t") == "example" for x in section):
                insert_at = i + 1
                if section and section[0].get("t") == "ins":
                    insert_at = i + 2
                # append the example into the output stream at the right point
                # by rebuilding: mark a pending insert
                b["_example"] = examples[key]
                added += 1
                used.add(key)
        i += 1

    # second pass: insert pending examples after h2 or after following ins
    final = []
    idx = 0
    while idx < len(out):
        b = out[idx]
        final.append(b)
        if "_example" in b:
            text = b.pop("_example")
            nxt = out[idx + 1] if idx + 1 < len(out) else None
            final.append({"t": "example", "x": text})
            # if the next block is an ins, move the example after it
            if nxt is not None and nxt.get("t") == "ins":
                final.pop()
                final.append(nxt)
                final.append({"t": "example", "x": text})
                idx += 1
        idx += 1

    data["blocks"] = final
    open(cpath, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    missing = [k for k in examples if k not in used]
    print(f"{content_file:22} +{added:2} examples  missing={missing}")
