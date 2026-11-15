"""Validate GDD content JSON before rendering. Usage: python validate_content.py"""
import json
import re
import sys
from pathlib import Path

ALLOWED = {"kicker", "h1", "purpose", "ins", "h2", "h3", "p", "fill", "bul",
           "num", "check", "table", "callout", "quote", "hr", "pb", "fontdemo",
           "cover", "example", "image"}
REQUIRED = {"kicker": "x", "h1": "x", "purpose": "x", "ins": "x", "h2": "x",
            "h3": "x", "p": "x", "fill": "x", "quote": "x", "callout": "label",
            "table": "head", "fontdemo": "items", "cover": "title"}

bad = 0
for path in sorted(Path("content").glob("[0-9][0-9]_*.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    blocks = data.get("blocks", [])
    words = 0
    problems = []
    h2s = []
    for i, b in enumerate(blocks):
        t = b.get("t")
        if t not in ALLOWED:
            problems.append(f"#{i} unknown type {t!r}")
            continue
        if t in REQUIRED and REQUIRED[t] not in b:
            problems.append(f"#{i} {t} missing {REQUIRED[t]!r}")
        if t in ("bul", "num", "check"):
            if not isinstance(b.get("x"), list):
                problems.append(f"#{i} {t} x is not a list")
            else:
                for item in b["x"]:
                    words += len(item.split())
                    if "\t" in item:
                        problems.append(f"#{i} {t} item has a tab (nested bullets unsupported)")
        elif t == "table":
            head, rows = b.get("head", []), b.get("rows", [])
            if not isinstance(head, list) or not isinstance(rows, list):
                problems.append(f"#{i} table head/rows must be lists")
            else:
                for r, row in enumerate(rows):
                    if len(row) != len(head):
                        problems.append(f"#{i} table row {r} has {len(row)} cells, expected {len(head)}")
                    words += sum(len(str(c).split()) for c in row)
                words += sum(len(str(c).split()) for c in head)
            w = b.get("w")
            if w and len(w) != len(head):
                problems.append(f"#{i} table widths {len(w)} != columns {len(head)}")
        elif t in ("fontdemo",):
            words += sum(len(str(x.get("desc", "")).split()) + len(str(x.get("sample", "")).split())
                         for x in b.get("items", []))
        elif t == "cover":
            words += len(str(b.get("tagline", "")).split())
        else:
            words += len(str(b.get("x", "")).split())
        if t == "h2":
            h2s.append(b.get("x", ""))
    text = json.dumps(data)
    if text.count("{{") != text.count("}}"):
        problems.append("unbalanced {{ }} placeholders")
    if any(k in text.lower() for k in ("lorem ipsum", "tbd", "todo")):
        problems.append("contains lorem/TBD/TODO")
    has_done = any("definition of done" in h.lower() for h in h2s)
    has_open = any("open question" in h.lower() for h in h2s)
    if not has_done:
        problems.append("missing 'Definition of done' section")
    if not has_open:
        problems.append("missing 'Open questions' section")
    print(f"{path.name:20} {len(blocks):3} blocks  {words:5} words  h2={len(h2s):2}"
          f"  {'OK' if not problems else 'PROBLEMS'}")
    for p in problems:
        print("   -", p)
    bad += len(problems)

print("\nTOTAL PROBLEMS:", bad)
sys.exit(1 if bad else 0)
