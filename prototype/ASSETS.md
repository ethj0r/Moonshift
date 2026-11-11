# Existing asset audit and integration plan

Inspected on 2026-11-11 from the repository's GLB JSON chunks and PNG headers. These are file and scene-structure measurements, not runtime benchmarks. Source assets remain unchanged during planning and implementation; any prepared copies will live under `prototype/`.

## What exists

| Inventory | Measured size | Implication |
| --- | --- | --- |
| 34 per-asset GLBs in the five category directories | 1,656,972 bytes, approximately 1.58 MiB | Download size is already modest; load a selected subset rather than every model |
| 3 legacy top-level GLBs | 364,216 bytes | Exclude these duplicate/showcase exports |
| All 37 GLBs together | 2,021,188 bytes | Do not accidentally copy both generations into the build |
| 10 PNG renders | Each approximately 1.03–1.44 MB; 1200×1200 through 2000×900 | Useful appearance references, expensive and unsuitable as full-resolution gameplay textures |
| `MOONSHIFT_assets.blend` | 414,367 bytes | Authoring source only; do not ship to the browser |

Every inspected GLB has zero embedded images and zero animation clips. Materials carry the color. Some use `KHR_materials_emissive_strength`; transparent glass is present in the habitat. Simple code-driven movement and grouped fan rotation are needed; there are no ready-to-play character animations.

Low triangle count is not the same as low render cost: the board contains **57 mesh primitives for 1,520 triangles**, and B.E.E.P. contains **47 for 1,604 triangles**. Each primitive/material submission can contribute a draw call, with extra work from shadows and transparency. Actual calls must be measured in the renderer.

## Planned model subset

All paths below are relative to [`../exports/`](../exports/). Counts describe the current source files before preparation.

| File | Bytes | Triangles | Mesh primitives | Gameplay use |
| --- | ---: | ---: | ---: | --- |
| `01_Characters/MOONSHIFT_CHR_BEEP_Robot.glb` | 110,588 | 1,604 | 47 | Selected-work feedback and short travel animation |
| `01_Characters/MOONSHIFT_CHR_Crew_A.glb` | 83,912 | 1,356 | 19 | Commander; moves with crew group |
| `01_Characters/MOONSHIFT_CHR_Crew_B.glb` | 83,880 | 1,356 | 19 | Technician; moves with crew group |
| `01_Characters/MOONSHIFT_CHR_Crew_C.glb` | 83,876 | 1,356 | 19 | Researcher; moves with crew group |
| `03_AirSystem/MOONSHIFT_AIR_Placement_Board_3x3.glb` | 115,836 | 1,520 | 57 | Cargo puzzle, after marker corrections |
| `03_AirSystem/MOONSHIFT_AIR_Fan_Branch.glb` | 31,980 | 396 | 15 | Powered shelter ventilation |
| `03_AirSystem/MOONSHIFT_AIR_Main_Air_Unit.glb` | 48,160 | 692 | 19 | Always-ready main air in this slice |
| `02_Items/MOONSHIFT_ITM_Battery_Portable.glb` | 25,708 | 328 | 10 | I01, one cell, consumed for +1 power |
| `02_Items/MOONSHIFT_ITM_Crate_Research_Large_2Tile.glb` | 62,816 | 920 | 18 | I05, two adjacent cells |
| `04_Facilities/MOONSHIFT_FAC_Habitat_Module.glb` | 150,856 | 2,270 | 50 | Crew destination outside the storm |
| `04_Facilities/MOONSHIFT_FAC_Garden_Facility.glb` | 71,332 | 874 | 28 | Care progress and one harvest |
| `04_Facilities/MOONSHIFT_FAC_Workshop_Intact.glb` | 62,184 | 744 | 33 | Research preparation; fixed as retained |
| `04_Facilities/MOONSHIFT_FAC_Radio_Station.glb` | 61,224 | 678 | 37 | S5 report/research transmission |
| `05_Opening_Environment/MOONSHIFT_ENV_Terrain_Rocks.glb` | 11,680 | 100 | 5 | Sparse repeated environment detail |
| **Total, one instance of each** | **1,004,032** | **14,194** | **376** | Before hiding, merging, repeated props, or procedural additions |

The garden kit is already installed in the starting snapshot, so its loose model is unnecessary. Do not map the one-cell research equipment model to the two-cell gameplay crate. Maintenance kit, portable fan, service-access markings, and other older concepts do not introduce additional mechanics.

## How the renders are used

Use [the board render](../renders/sheet_04_board.png), [facility sheet](../renders/sheet_05_facilities.png), and character/item sheets as the appearance baseline for the interactive GLB scene: framing, color, silhouettes, and light direction.

For item cards, generate two small transparent thumbnails from the prepared battery and research-crate models after approval, using the same camera and lighting. Aim for 128–256 pixels and at most 30 KB each in WebP, or optimized PNG if smaller. Existing sheets have baked background, shadows, and display bases; cropping them alone will not produce clean movable sprites. No thumbnail is required before the 3D scene becomes playable; labeled DOM buttons work during loading.

A single resized existing render may serve as a loading/error poster if it fits a 100 KB budget. Load it as a DOM image, not a GPU texture. Avoid loading contact sheets or reference art into the runtime. A 1600×1000 RGBA image alone decodes to about 6.1 MiB before additional copies or mipmaps.

A 2D sprite version remains a fallback if measured devices cannot meet the 3D performance gate. It requires fresh isolated renders, depth sorting, and fixed-view hit mapping; it is not a free substitute for the present PNG sheets.

## Required preparation after approval

1. **Create an explicit manifest.** Copy only the selected GLBs to a generated `prototype/public/assets/` directory using a repeatable preparation step. Record source path, prepared path, byte size, and any transformation. Preserve the repository license. Never copy `.blend`, references, legacy exports, or full render sheets. Both development and production must use these same prepared files.
2. **Normalize presentation transforms.** GLB is already Y-up; do not apply a second Blender-axis conversion. Some roots retain showcase yaw: B.E.E.P. is about 25° and the research crate about 20°. Remove only the documented display rotation on prepared roots, verify front +Z, ground contact, and dimensions, then apply deliberate scene orientation. Start B.E.E.P. near 0.7× the crew height and review readability.
3. **Fix the board's meaning.** The existing model shows two striped vent zones, a service X, and a crew pad. The design requires three air openings, A2/B2/C2, and a separate protected room. Hide/replace `VentZone_*` and `ServiceZone_*` markings; remove the crew-pad decoration as a shelter cue. Add three consistent striped openings with labels. Keep the board base and nine tiles. The shared logical grid defines gameplay, never decorative node names alone.
4. **Define cell and footprint transforms.** The tiles use 1.05 m pitch. `Board_Tile_00` is near `(−1.05, 0.34, −1.05)` and `Board_Tile_22` near `(1.05, 0.34, 1.05)` in GLB coordinates. Explicitly map rows/columns to these centers, label the mapping, and verify all nine cells visually. Convert the logical first-cell anchor into the physical midpoint for the two-cell crate; rotate its group about that derived placement. Check bounding boxes so the crate fits two cells and the battery fits one.
5. **Add the missing shelter simply.** Build one small thick-walled room with a visible doorway using palette-colored primitives. Connect it to the habitat with a crew corridor and to the board with air-route indicators. This is the only new gameplay structure. No new Blender asset is required to prove the loop.
6. **Separate decoration from facilities.** The habitat export already includes a small garden, radio, solar array, and fan. Hide its attached `Garden`/`Radio` groups when using the standalone garden and radio, or make them clearly noninteractive. Players must see one actionable garden and one radio. Do not label the habitat's existing fan as a second branch fan.
7. **Reduce submissions without losing states.** In prepared copies, merge static geometry by compatible material within each asset after baking child transforms. Deduplicate equivalent materials across assets. Keep glass separate, preserve flat normals, and exclude fan blades, state lights, selection meshes, and moving parts from inappropriate merges. Use a small material copy only where instance-specific status needs it. Measure before considering instancing or more elaborate batching.
8. **Prepare minimal movement and states.** Move whole B.E.E.P./crew groups along fixed short paths. Group `FanB_Blade*` nodes around the verified hub pivot for rotation only during active feedback. Reflect garden progress, radio activity, route readiness, and research state with labels plus small material/visibility changes. These are presentation effects; animations never decide a rule outcome.
9. **Validate the result.** Run a glTF validator, compare screenshots against the source renders, inspect glass ordering and emissive intensity, and record prepared bytes/primitives. Geometry compression is conditional: first compare its transfer saving with decoder download and CPU cost. Texture codecs offer little benefit to these texture-free models.

Do not block the prototype on new character rigs, a lander interior, physical pipes for every route, a full terrain generator, or production-quality asset variants.
