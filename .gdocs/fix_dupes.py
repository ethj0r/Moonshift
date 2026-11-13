import json
import sys

sys.path.insert(0, r"C:\Users\ASUS\.claude\skills\gdocs-api\scripts")
from gdlib import service, batch

DOC = "16vx3Ai3XW7bOYa2kJMxhspAVdl8qWVWRvd1SIAf9wXs"
PAIRS = [
    ("{{03 Narrative & World}}, {{03 Narrative & World}}", "{{03 Narrative & World}}"),
    ("{{06 Technical Design}}, {{06 Technical Design}}", "{{06 Technical Design}}"),
]

# fix the source JSON
p = "content/08_diagrams.json"
d = json.load(open(p, encoding="utf-8"))
for b in d["blocks"]:
    if b["t"] == "table":
        for row in b["rows"]:
            for i, cell in enumerate(row):
                if isinstance(cell, str):
                    for a, c in PAIRS:
                        cell = cell.replace(a, c)
                    row[i] = cell
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")

# fix the live doc text (applies to all tabs; these strings are unique)
for a, c in PAIRS:
    res = batch(DOC, [{"replaceAllText": {
        "containsText": {"text": a, "matchCase": True}, "replaceText": c}}])
    print(a, "->", res[0]["replies"][0].get("replaceAllText", {}).get("occurrencesChanged"))
