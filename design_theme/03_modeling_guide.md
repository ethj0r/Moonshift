# 03 · Modelling Guide

## 1. Shape language

Build everything from a small set of primitives:

| Primitive | Typical sides / subdivisions | Used for |
|---|---|---|
| Box | n/a | Bodies, crates, panels, walls, legs, slats |
| Cylinder | **6** (thin poles, valves) · **8** (canisters, wheels, buttons) · **10–12** (habitat, fans, rings) · **14** (large pads, scorch marks) | Tanks, pipes, wheels, lamps |
| Cone / tapered cylinder | 8 | Lander top, pot shapes, thrusters |
| Icosphere | **subdivision 1** | Plants, rocks, bulbs, fruit, small lights |
| UV sphere / hemisphere | 10–12 segments × 4–6 rings | Helmets, domes, radar dishes (squashed) |
| Torus / arc | 8–16 major × 4–6 minor | Handles, valve wheels, greenhouse ribs, crater rims, pipe elbows |
| Triangular prism | n/a | Roofs, triangle buttons, arrows |
| Hexagon tile | 6 sides, slightly tapered | Display bases |

Low side counts are part of the look: a canister should visibly have 8 faces.

## 2. Bevels (the most important detail)

Hard 90° edges look like a prototype; chamfered edges look like Outlanders.

- Use a **Bevel modifier**: Limit Method **Angle**, Angle **40°**, Harden Normals off.
- **Segments 1** (single chamfer) for most parts.
- **Segments 2** for "soft, huggable" hero shapes: B.E.E.P.'s head and body, crew suits, crate bodies, the workshop body, machine housings.
- Bevel width scales with object size:

| Object size | Width |
|---|---|
| Tiny (buttons, labels, latches) | 0.01 |
| Small parts (< 0.3 m) | 0.02–0.03 |
| Medium bodies (0.3–1 m) | 0.04–0.06 |
| Large or hero bodies | 0.07–0.09 |
| Display tile | 0.04 |

## 3. Shading

- **Flat shading on every face.** Do not smooth-shade; facets catch the sun and give the hand-made look.
- No textures, no normal maps, no UV work required. One material per part.
- If an engine requires UVs, the default glTF export is fine; no texturing is planned.

## 4. Scale and grid

Units are metres; Blender's Z is up; each asset's **front faces −Y** (toward the default camera).

| Reference | Size |
|---|---|
| Placement tile | 0.98 × 0.98 m, **pitch 1.05 m** (3×3 board) |
| 1-tile item footprint | ≤ ~0.7 × 0.7 m (fits inside a tile with margin; small extras like a wrench or watering can may poke out) |
| 2-tile crate footprint | 1.8–1.86 × 0.82–0.88 m |
| Crew height | ~2.0 m (built at ~1.05 m and root-scaled ×1.9) |
| B.E.E.P. height | ~1.9 m (including antenna) |
| Workshop | 1.7 × 1.2 m body, ridge at ~1.75 m |
| Habitat | Ø 1.9 m, dome top ~1.65 m, mast to ~2.4 m |
| Radio tower | ~3.6 m to beacon |
| Cargo lander | Ø 2.0 m hull, ~3.1 m tall, display tile R 2.4 m |

Rules:
- An asset's **origin is its root empty**, placed at ground level (Z = 0) at the footprint centre.
- Grid-based objects must respect the tile footprint exactly, because gameplay relies on "1 tile vs 2 tiles."

## 5. Proportions and "toy" exaggeration

- Handles, latches, valve wheels, buttons and lights are **1.5–2× realistic size**.
- Characters: helmet radius ≈ 0.24 of a ~1.05 m base body (big head); legs short; arms thick.
- Machines get a "face": a navy screen plus 1–3 glowing dots.
- Give each asset at least one **accent band** (terracotta, mustard or the item's signature colour) to break up large single-colour surfaces.
- Add small imperfections: tilt crates 8–25°, rotate pots and plants randomly, give the lander a broken leg and a 5–6° lean.

## 6. Composition on a display tile

- Each asset is presented on a hex tile: **top = Regolith Sand, side = Tile Side**, thickness 0.2 m × Z-scale 2.2 (≈ 0.44 m).
- Tile radius by asset size: **0.85** (small items/props) · **0.9** (crew) · **1.25** (B.E.E.P.) · **1.3** (rack, debris, rocks, main air unit) · **1.45** (2-tile crates) · **1.6–1.9** (facilities) · **2.4** (lander) · **2.6** (habitat).
- Facilities sit on a dark plum slab (`#4A4357`) inside the tile, like a foundation.
- Rotate assets **20–25°** on Z so the camera sees two faces.
- Display tiles are for presentation only and are **not exported**.

## 7. Polygon budgets (triangles, after bevels)

Target is a browser game on phones and desktops.

| Category | Budget | Actual range |
|---|---|---|
| Small items and props | ≤ 600 | 100–524 |
| 2-tile crates | ≤ 1,000 | 720–920 |
| Air-system pieces | ≤ 700 | 236–692 |
| Characters | ≤ 1,700 | 1,356–1,604 |
| Facilities | ≤ 2,500 | 678–2,270 |
| Large scene pieces (board, lander) | ≤ 1,600 | 988–1,520 |

If over budget: reduce cylinder sides first (12→10→8), then reduce bevel segments 2→1 on hidden parts.

## 8. Asset recipes (examples)

**Crate:** box body (seg-2 bevel) → slightly larger lid → lighter inset lid panel → 4 corner posts in mustard → 2 cream bands → front label in the accent colour → side handles in dark plum → one teal status light.

**Machine:** dark plinth → cream body (seg-2 bevel) → terracotta stripe → navy screen with 2–3 glow dots → steel pipe stub with a terracotta flange.

**Building (Outlanders house):** dark slab → cream box body → terracotta prism roof with a darker ridge → blue door with slats inside a terracotta frame → teal window → chimney → one exterior prop (bench, tank, sign).

**Plant:** icosphere subdivision 1, scaled Z ×1.15–1.2, random Z rotation, alternate Leaf / Leaf Light; optional terracotta "fruit" icospheres (r ≈ 0.045).
