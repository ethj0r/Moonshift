import glob
import json
import os
import re

for f in sorted(glob.glob("content/0[0-9]_*.json")):
    txt = open(f, encoding="utf-8").read()
    for kw in ["twelve shifts", "six shifts", "nine months", "14 months",
               "4–8 minutes", "12–18", "3–4 hours", "6 rooms", "six rooms"]:
        for m in re.finditer(re.escape(kw), txt):
            print(os.path.basename(f), kw, "::",
                  txt[max(0, m.start() - 120):m.start() + 120].replace("\\n", " "))
