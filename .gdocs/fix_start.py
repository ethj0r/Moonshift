import json

p = "content/00_start.json"
d = json.load(open(p, encoding="utf-8"))
for b in d["blocks"]:
    if b.get("t") == "table" and b.get("head") == ["Tab", "What it answers", "Primary owner", "Fill when"]:
        b["rows"].insert(0, ["00 Start Here",
                             "How do we use this document, and what is the quality bar?",
                             "Producer", "Day one"])
        for row in b["rows"]:
            if row[0] == "04 Experience":
                row[0] = "04 Experience: UX, UI, Audio"
        break
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
print("tab map updated")
