# 06 · Pipeline, Naming and Export

## 1. Folder layout

```
C:/Kuliah/hackathon/nasa-26/moonshift_early/
├── MOONSHIFT_assets.blend        ← all assets, lights, camera, helper script
├── design_theme/                 ← these Markdown files
├── references/                   ← Outlanders reference images (Steam store art)
├── renders/                      ← overview, close-ups, contact sheets (PNG)
└── exports/
    ├── 01_Characters/
    ├── 02_Items/
    ├── 03_AirSystem/
    ├── 04_Facilities/
    └── 05_Opening_Environment/
```

## 2. Collections in the .blend

```
Scene Collection
├── Lighting                       (Sun, Fill, Camera)
├── Asset_01_BEEP_Robot
├── Asset_02_Cargo_Set             (showcase group)
├── Asset_03_Habitat_Module
├── MOONSHIFT_Characters
│   └── CHR_Crew_A / CHR_Crew_B / CHR_Crew_C
├── MOONSHIFT_Items
│   └── ITM_<Name> …
├── MOONSHIFT_AirSystem
│   └── AIR_<Name> …
├── MOONSHIFT_Facilities
│   └── FAC_<Name> …
└── MOONSHIFT_Opening_Environment
    └── ENV_<Name> …
```

One asset = one sub-collection.

## 3. Naming conventions

| Thing | Pattern | Example |
|---|---|---|
| Category prefix | `CHR_` character · `ITM_` item · `AIR_` air system · `FAC_` facility · `ENV_` opening / environment | `ITM_Garden_Kit` |
| Asset root (empty) | `<Asset>_root` | `Garden_Kit_root` |
| Parts | `<ShortAsset>_<Part><Index>` | `GKit_Pot2`, `FanB_Blade3` |
| Display tile | `<Asset>_DisplayTile` | `Garden_Kit_DisplayTile` |
| Showcase-only props | `Tile_<Name>` | `Tile_Crater0` |
| Materials | `M_<ColourOrPurpose>` | `M_Terracotta`, `M_GlowTeal` |
| Grid size in the name | `_1Tile`, `_2Tile` | `ITM_Crate_Long_2Tile` |
| Export file | `MOONSHIFT_<Collection>.glb` | `MOONSHIFT_AIR_Pipe_T.glb` |

**Reuse materials by name.** The `mat()` helper returns the existing material if the name already exists, so the palette stays consistent.

## 4. Helper script (`moon_helpers` text block)

The .blend contains a text block named **`moon_helpers`**. Load it in any script with:

```python
exec(bpy.data.texts["moon_helpers"].as_string())
p = P()   # dictionary of palette materials: p['cream'], p['terra'], p['teal'] …
```

| Function | Purpose |
|---|---|
| `mat(name, hex, rough=0.85, emit=None, estr=2, alpha=1, metal=0)` | Create or reuse a flat material (handles sRGB → linear) |
| `coll(name)`, `subcoll(parent, name)` | Get or create collections |
| `empty(name, loc, coll, parent)` | Asset root / pivot |
| `box(name, size, loc, mat, coll, parent, rot, bev, seg)` | Bevelled, flat-shaded box |
| `cyl(name, r, depth, loc, mat, coll, parent, rot, verts, bev, r2)` | Cylinder / cone (`r2` = top radius) |
| `ico(…)`, `uvs(…, half=True)` | Icosphere / UV sphere / hemisphere |
| `torus(…)`, `arc(…, a0, a1)` | Rings, handles, elbows |
| `prism(name, w, d, h, …)` | Roofs, triangle buttons, arrows |
| `hex_tile(…)`, `tile2(name, R, h, loc, coll)` | Hex display tile (sand top + cliff side) |
| `grid_layout(entries, base, cols, sy)` | Lay out assets along the camera's horizontal axis, in rows |
| `render_set([collections], path, res)` | Auto-frame and render only those collections |

### Example: adding a new asset

```python
import bpy, math
exec(bpy.data.texts["moon_helpers"].as_string())
p = P()
C = subcoll("MOONSHIFT_Items", "ITM_Water_Tank")
R = empty("Water_Tank_root", (0, 0, 0), C)
cyl("WTank_Body", 0.28, 0.7, (0, 0, 0.4), p['bluel'], C, R, verts=10, bev=0.03)
cyl("WTank_Band", 0.29, 0.08, (0, 0, 0.5), p['terra'], C, R, verts=10)
cyl("WTank_Cap", 0.12, 0.08, (0, 0, 0.79), p['steel'], C, R, verts=8)
cyl("WTank_Light", 0.03, 0.02, (0, -0.29, 0.6), p['teal'], C, R, rot=(math.radians(90), 0, 0), verts=8)
R.rotation_euler.z = math.radians(20)
t = tile2("Water_Tank_DisplayTile", 0.85, 0.2, R.location.copy(), C); t.scale.z = 2.2
render_set(["ITM_Water_Tank"], r"C:\…\renders\test_water_tank.png", res=(1200, 1200))
```

## 5. Export rules (glTF 2.0)

| Setting | Value |
|---|---|
| Format | **GLB** (binary) |
| Selection | Only the asset's objects, **excluding** `*_DisplayTile` and `Tile_*` |
| Apply modifiers | **Yes** (bevels baked) |
| Origin | Asset root moved to world XY (0, 0) before export; ground at Z = 0 |
| Up axis | glTF converts Blender Z-up to Y-up automatically |
| Facing | The asset's front faces Blender −Y, which is glTF **+Z** |
| Materials | Principled → glTF PBR (base colour, roughness, emissive, alpha) |
| Compression | None (Draco is available if needed for the web build) |

The batch export script in the project loops over every sub-collection, temporarily moves its top-level objects to the origin, exports, restores positions and reports triangle counts.

## 6. New-asset checklist

- [ ] Built from primitives; flat-shaded; bevel modifier (angle 40°, seg 1–2)
- [ ] Only palette materials (`02_color_palette.md`); no new near-duplicate colours
- [ ] 1–3 small glow accents, using the right meaning (teal / amber / red / pink)
- [ ] Readable without colour: unique silhouette, icon or pattern
- [ ] Front faces −Y; root empty at the ground-centre; grid footprint respected (1 or 2 tiles)
- [ ] Within the triangle budget (`03_modeling_guide.md`)
- [ ] Named `<PREFIX>_<Name>` in the right category collection; parts prefixed
- [ ] Rendered with `render_set` and checked against the existing contact sheets
- [ ] Exported to `exports/<category>/MOONSHIFT_<PREFIX>_<Name>.glb`
