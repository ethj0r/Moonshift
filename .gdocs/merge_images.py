"""Insert rendered diagram images after each recipe's ASCII sketch in 08_diagrams.json."""
import json

PATH = "content/08_diagrams.json"
MAP = {
    "8.4 Game flow / mode map": ("01_game_flow", "Rendered example — Moonshift game flow and mode map."),
    "8.5 Core loop (nested loops)": ("02_core_loop", "Rendered example — Moonshift core loop at three time scales."),
    "8.6 State machine (player, AI, session)": ("03_state_machine", "Rendered example — Moonshift sentry AI state machine."),
    "8.7 Activity / quest flowchart": ("04_quest_flow", "Rendered example — Moonshift quest “Dry Garden”."),
    "8.8 Sequence / interaction timing": ("05_sequence", "Rendered example — Moonshift hit-confirm sequence and 80 ms budget."),
    "8.9 Systems map / dependency graph": ("06_systems_map", "Rendered example — Moonshift systems map."),
    "8.10 Class / entity data model": ("07_class_model", "Rendered example — Moonshift inventory and character data model."),
    "8.11 Economy flow (faucets, sinks, pools, converters)": ("08_economy", "Rendered example — Moonshift gold and ore economy."),
    "8.12 Level flow / beat chart (map + pacing curve)": ("09_level_flow", "Rendered example — Moonshift Relay 3 level flow and intensity beats."),
    "8.13 Narrative branch graph": ("10_narrative_branch", "Rendered example — Moonshift act-three branch graph."),
    "8.14 Progression / unlock graph": ("11_progression", "Rendered example — Moonshift traversal unlock graph."),
    "8.15 UX screen flow and wireframe": ("12_ux_flow", "Rendered example — Moonshift screen flow and HUD regions."),
}

data = json.load(open(PATH, encoding="utf-8"))
blocks = data["blocks"]
out = []
i = 0
added = 0
while i < len(blocks):
    b = blocks[i]
    out.append(b)
    if b.get("t") == "h2" and b.get("x") in MAP:
        j = i + 1
        while j < len(blocks) and blocks[j].get("t") not in ("h1", "h2"):
            j += 1
        section = blocks[i + 1:j]
        if not any(x.get("t") == "image" for x in section):
            key, cap = MAP[b["x"]]
            # after the ASCII sketch if present, else after the first table, else at end
            insert_after = None
            for k, x in enumerate(section):
                if x.get("t") == "p" and "\n" in x.get("x", ""):
                    insert_after = i + 1 + k
                    break
            if insert_after is None:
                for k, x in enumerate(section):
                    if x.get("t") == "table":
                        insert_after = i + 1 + k
                        break
            if insert_after is None:
                insert_after = j - 1
            # append marker to the block we insert after
            blocks[insert_after]["_image"] = (key, cap)
            added += 1
    i += 1

final = []
for b in blocks:
    img = b.pop("_image", None)
    final.append(b)
    if img:
        final.append({"t": "image", "key": img[0], "caption": img[1]})

data["blocks"] = final
open(PATH, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print("inserted", added, "images")
