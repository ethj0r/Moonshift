"""Generate the 12 GDD diagram images through mermaid.ink and save a manifest.

Run from .gdocs: python make_diagrams.py
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

OUT = Path("diagrams")
OUT.mkdir(exist_ok=True)
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

THEME = """%%{init: {'theme':'base','themeVariables':{
 'fontFamily':'Arial, Helvetica, sans-serif','fontSize':'26px',
 'primaryColor':'#EEF4FF','primaryTextColor':'#0B1F3A','primaryBorderColor':'#2F6FED',
 'lineColor':'#475467','secondaryColor':'#FFF7E6','tertiaryColor':'#F2F7FF',
 'background':'#FFFFFF','mainBkg':'#EEF4FF','nodeBorder':'#2F6FED',
 'clusterBkg':'#F8FAFC','clusterBorder':'#D0D5DD','edgeLabelBackground':'#FFFFFF',
 'actorBkg':'#EEF4FF','actorBorder':'#2F6FED','actorTextColor':'#0B1F3A',
 'signalColor':'#475467','signalTextColor':'#0B1F3A','labelBoxBkgColor':'#FFFFFF',
 'labelBoxBorderColor':'#D0D5DD','noteBkgColor':'#FFF7E6','noteBorderColor':'#B45309'
}}}%%
"""

DIAGRAMS = {
    "01_game_flow": """flowchart TB
  B([Boot]) --> T([Title]) --> M([Main Menu])
  M -->|Continue| S[Save Select] --> P[Gameplay]
  M -->|New Game| D[Difficulty] --> P
  M -->|Settings| G[Settings] --> M
  P -->|pause| Z[Pause]
  Z -->|resume| P
  Z -->|quit| M
  P -->|death| R[Results]
  R -->|retry| P
  R -->|exit| M
""",
    "02_core_loop": """flowchart TB
  subgraph M[Moment 5–30 s]
    direction LR
    A[Scan] --> B[Choose] --> C[Place] --> D[Verify] --> A
  end
  subgraph S[Session 20–40 min]
    direction LR
    E[Route] --> F[Clear room] --> G[Spend loot] --> H[Unlock] --> E
  end
  subgraph L[Long term days–weeks]
    direction LR
    I[Upgrade] --> J[Specialise] --> K[Replay] --> I
  end
  M --> S --> L
""",
    "03_state_machine": """stateDiagram-v2
  [*] --> Idle
  Idle --> Alert: sees player
  Alert --> Attack: in range
  Alert --> Search: lost LOS 1.5 s
  Attack --> Chase: out of range
  Chase --> Attack: in range
  Chase --> Search: lost LOS 3 s
  Search --> Alert: hears noise
  Search --> Idle: 8 s timeout
  Attack --> [*]: HP <= 0
""",
    "04_quest_flow": """flowchart TB
  subgraph A[Approach]
    direction LR
    A1([Talk to Quartermaster]) --> A2[Reach Relay 3] --> A3{Alarm raised?}
  end
  subgraph B[Sabotage]
    direction LR
    B1[Plant charge A] --> B2[Plant charge B] --> B3{Both planted?}
  end
  A3 -->|yes| X([Fail: alarm])
  A3 -->|no| B1
  B3 -->|yes| H([Complete]) --> I([Reward])
  B3 -->|no| G[Return to missing charge] --> B3
""",
    "05_sequence": """sequenceDiagram
  actor P as Player
  participant I as Input
  participant G as Gameplay
  participant S as Server
  participant U as UI
  participant A as Audio
  P->>I: press
  I->>G: intent
  G->>S: validate
  S-->>G: ok
  G->>U: damage
  G->>A: play SFX
  U-->>P: shake
  G->>U: update HP
  Note over G,U: 80 ms budget
""",
    "06_systems_map": """flowchart LR
  I[Input] --> M[Movement] --> AN[Animation]
  I --> C[Combat]
  C --> D[Damage] --> H[Health] --> HUD[HUD]
  C --> L[Loot] --> INV[Inventory] --> SV[Save]
  L --> E[Economy] --> PR[Progression]
  E -.-> L
""",
    "07_class_model": """classDiagram
  class Character {
    +UUID id
    +int level
    +StatBlock stats
  }
  class ItemInstance {
    +UUID instanceId
    +ItemDef defId
    +int qty
  }
  class ItemDef {
    +string id
    +Rarity rarity
    +string[] tags
  }
  class AbilitySlot {
    +int slot
  }
  Character "1" --> "n" ItemInstance : owns
  Character "1" --> "n" AbilitySlot : has
  ItemInstance "n" --> "1" ItemDef : definition
""",
    "08_economy": """flowchart LR
  Q[Quest] -->|+120/h| G[(Gold)]
  D[Daily] -->|+40/h| G
  X[Dismantle] -->|+15/h| G
  G -->|-80/h| V[Vendor]
  G -->|-25/h| R[Repair]
  G -->|-10/h| SP[Respec]
  G -->|3 Gold + 1 Ore| F[Forge]
  O[(Ore)] --> F
  F --> SH[(Shard)]
""",
    "09_level_flow": """flowchart TB
  A([Entry]) --> B[Teach crouch] --> C[Combat 1] --> D[Hub]
  D --> E[Secret]
  D --> F[Traverse] --> G[Arena] --> H([Exit])
  subgraph P[Intensity 0–10]
    direction LR
    P1[Entry 1] --> P2[Teach 3] --> P3[Combat 6] --> P4[Hub 4] --> P5[Arena 9] --> P6[Exit 5]
  end
""",
    "10_narrative_branch": """flowchart TB
  A([Arrival]) --> B{Trust Mira?}
  B -->|yes| C[The Deal]
  B -->|no| D[Search the wreck]
  C --> E{Accept?}
  E -->|yes| F([Ending A])
  E -->|no| G[Fallout] --> H([Ending B])
  D --> I[Black Box] --> J{Share?}
  J -->|yes| F
  J -->|no| K([Ending C])
""",
    "11_progression": """flowchart TB
  S([Start]) --> DJ[Double Jump] --> WC[Wall Climb] --> GL[Glide] --> FG([Final Gate])
  DJ --> SA[Secret A]
  WC --> SC[Shortcut]
  GL --> SD[Secret C]
  DJ --> GR[Grapple] --> SB[Secret B]
""",
    "12_ux_flow": """flowchart TB
  T([Title]) --> M[Main Menu]
  M --> SET[Settings] --> M
  M --> SV[Save Select] --> M
  M --> NG[New Game] --> HUD[HUD]
  HUD <--> PA[Pause]
  PA --> M
  subgraph W[HUD wireframe 16:9]
    direction LR
    OBJ[Objective] --- MAP[Minimap]
    RET[Reticle] --- STA[Status]
    HP[Health] --- AM[Ammo]
  end
  HUD -.-> W
""",
}


def url_for(source):
    b = base64.urlsafe_b64encode((THEME + source).encode()).decode().rstrip("=")
    return "https://mermaid.ink/img/" + b + "?bgColor=FFFFFF"


def main():
    manifest = {}
    for name, source in DIAGRAMS.items():
        u = url_for(source)
        if len(u) > 1900:
            print("WARN long url", name, len(u))
        png = OUT / f"{name}.png"
        subprocess.run(["curl.exe", "-L", "-s", "-A", UA, "-o", str(png),
                        "-w", "%{http_code}", u], check=False, capture_output=True)
        try:
            im = Image.open(png)
            w, h = im.size
            manifest[name] = {"url": u, "w": w, "h": h,
                              "file": str(png).replace("\\", "/")}
            print(f"{name:22} {w:4}x{h:<4} {len(u):4} chars")
        except Exception as e:  # noqa: BLE001
            print("FAILED", name, e, "url", len(u))
            manifest[name] = {"url": u, "error": str(e)}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print("saved", OUT / "manifest.json")


if __name__ == "__main__":
    main()
