import json
import sys

sys.path.insert(0, r"C:\Users\ASUS\.claude\skills\gdocs-api\scripts")
from gdlib import service, ptext

DOC = "1TSYd9qoBF6HnQX2wjUZRiA1RbMiFabj6_EJeXb6cyYI"
d = service().documents().get(documentId=DOC, includeTabsContent=True).execute()
print("tabs:", len(d.get("tabs", [])))
for t in d.get("tabs", []):
    dt = t["documentTab"]
    body = dt["body"]["content"]
    text = "".join(ptext(e["paragraph"]) for e in body if "paragraph" in e)
    tables = sum(1 for e in body if "table" in e)
    imgs = len(dt.get("inlineObjects", {}))
    examples = sum(1 for e in body if "paragraph" in e and ptext(e["paragraph"]).startswith("EXAMPLE"))
    done = "Definition of done" in text
    openq = "Open questions" in text
    print(f'{t["tabProperties"]["index"]} {t["tabProperties"]["title"]:30} '
          f'words={len(text.split()):5} tables={tables:2} images={imgs:2} '
          f'examples={examples:2} done={done} open={openq}')

# check content JSON counts
for f in sorted(__import__("glob").glob("content/0[0-9]_*.json")):
    data = json.load(open(f, encoding="utf-8"))
    print(f.split("\\")[-1], "json examples",
          sum(1 for b in data["blocks"] if b["t"] == "example"),
          "images", sum(1 for b in data["blocks"] if b["t"] == "image"))
