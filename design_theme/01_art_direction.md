# 01 · Art Direction

## 1. Reference: what we took from Outlanders

Reference images (Steam store art) are saved in `../references/`. Looking at them, these traits define the Outlanders look:

| Outlanders trait | How MOONSHIFT uses it |
|---|---|
| Chunky, slightly oversized props on small islands of land | Every asset sits on a thick **hex display tile** (sand top, brown cliff side) |
| Warm, saturated colours: orange-terracotta roofs, cream walls, sandy ground | Same base trio: **Cream `#F7E6C8` / Terracotta `#E2683A` / Sand `#E6CFB2`** |
| Soft blue atmosphere and sky | Bright **sky-blue backdrop `#7FC1F2`** with cool blue ambient light |
| Low warm sun, long soft shadows, gentle contrast | Warm sun `#FFE2B8` with a small angle (6°) for soft-edged shadows |
| Simple geometric shapes, visible facets, no texture noise | Primitives (boxes, 8–12 sided cylinders, low icospheres), **flat shading** |
| Cosy, friendly, "wholesome" tone | Rounded chamfers, toy proportions, small glowing "faces" on machines |

**We changed:** the setting is the Moon, so we use regolith ground, craters, rocks, glass domes, pipes, antennas and a cargo lander instead of trees, water and wooden houses. The workshop still borrows the Outlanders house silhouette (gable roof and chimney) on purpose, so the base feels like a little *settlement*, not a cold lab.

## 2. Style pillars

1. **Toy-like and chunky.** Objects look like they could be picked up. Thick parts, no thin fragile detail unless it is a deliberate accent (antenna, mast).
2. **Warm on the ground, cool in the air.** Warm materials and sunlight, with cool sky fill. This warm/cool split is what makes the scenes feel alive.
3. **Readable in one glance.** A child should recognise *what it is* and *what state it is in* from the default camera, at thumbnail size.
4. **Status through glow, not text.** Small emissive parts (teal, amber, red, pink) show if something is on, needs attention or is locked. See the glow meanings in `02_color_palette.md`.
5. **Humour from personality, not gore.** B.E.E.P.'s face, slightly crooked crates and a broken lander leg show trouble without any danger to people (matching the design doc: no explicit death; trouble is shown with alarms and lights).

## 3. Mood words

Cosy · hopeful · handmade · tidy-but-improvised · sunny-lunar · "a little outpost that works because you made it work"

## 4. Readability rules (target audience 7–12)

These follow the accessibility section of the game design document.

- **Never use colour alone** to tell things apart. Route markers use colour **and** dot count (1 / 2 / 3) **and** an arrow. Air-regulator buttons use colour **and** shape (circle / triangle / square).
- **Big shapes first.** The silhouette must identify the object; detail only confirms it.
- **One signature colour per item type** (see the item colour coding table in `02_color_palette.md`), so the cargo choice in the 60-second opening is quick to read.
- **Puzzle zones are patterned, not just tinted.** Vent zone = blue stripes; service access = mustard X; crew zone = green round pad with a ring.
- **Grid-honest footprints.** A 1-tile item fits inside one board tile and a 2-tile crate fits two, so the puzzle rules can be read from the models themselves.
- **States are visible.** Intact vs dismantled workshop are separate models; the salvaged battery has a glowing amber ring so the reward is obvious before confirming.

## 5. Do / Don't

| Do | Don't |
|---|---|
| Use primitives with bevels of segment 1–2 | Use subdivision-smooth organic shapes |
| Keep faces flat-shaded so the facets show | Smooth-shade everything (that loses the Outlanders look) |
| Use the palette in `02_color_palette.md` | Invent new near-duplicate colours per asset |
| Add 1–3 small glowing accents per machine | Make large surfaces emissive (it washes out the sun) |
| Exaggerate key parts (handles, latches, eyes, lights) | Model tiny screws, cables and greebles everywhere |
| Tilt and rotate things a little for a handmade feel | Make perfectly aligned "CAD" layouts |
| Put dark navy `#2C3A4E` behind screens and doorways for depth | Use pure black `#000000` anywhere |
| Use regolith sand tones for the ground | Use realistic grey Moon dust (it reads cold and dull with this lighting) |

## 6. Characters

- **B.E.E.P.**: cream boxy body with terracotta trim, tank treads, a navy visor with teal eyes and a small smile, an amber antenna bulb, and a sage carry rack with a mustard box and mint battery. Personality comes from the face and the slight head tilt toward the camera.
- **Crew**: chunky suits with a big white helmet and dark visor with one white highlight; no visible face (keeps it simple and inclusive). Variants differ by suit colour **and** accent colour: A = white + terracotta, B = mustard + blue, C = mint + purple.
- Proportions: big head/helmet, short legs, wide body (Outlanders people are short and stocky).

## 7. Known open questions

- B.E.E.P. is about the same height as the crew (~1.9–2.0 m). The design doc calls it a "small" robot. Consider scaling it to ~0.7× when assembling the base map.
- Sky colour: we use the Outlanders-style bright sky for readability. A darker "space" sky was tried first and made the assets look dull. If a night/space mood is wanted for specific moments (e.g. Shift 6 radio call), use it only as a temporary lighting state, not the default.
