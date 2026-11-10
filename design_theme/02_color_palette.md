# 02 · Colour Palette

All values were taken directly from the materials in `MOONSHIFT_assets.blend`. Hex values are sRGB (what you type into Blender's colour picker, or a game engine's albedo colour).

Default material settings unless noted: Principled BSDF, **Roughness 0.85, Metallic 0, no textures.**

## 1. Core palette

These carry most of the look. Use them first.

| Swatch name | Hex | Material | Used for |
|---|---|---|---|
| Cream | `#F7E6C8` | `M_Cream` | Main bodies: habitat, workshop walls, B.E.E.P., machines |
| Terracotta | `#E2683A` | `M_Terracotta` | Roofs, trim bands, flanges, door frames: the signature accent |
| Terracotta Dark | `#B9502B` | `M_TerraDark` | Roof ridge, toolbox tray (shade of terracotta) |
| Mustard | `#F4B23A` | `M_Mustard` | Crate corners, hazard stripes, gears, frames |
| Sky Blue | `#4F8DC4` | `M_DustyBlue` | Doors, crates, fan housings, machine panels |
| Sky Blue Light | `#79B0DE` | `M_DustyBlueLight` | Lids, door slats, watering can |
| Off-white | `#FFF6E8` | `M_White` | Helmets, canisters, labels, lander hull |
| Dark Plum | `#4A4357` | `M_DarkGrey` | Bases, treads, handles, slabs (replaces black) |
| Steel | `#B7B3C2` | `M_Steel` | Posts, poles, valves, small metal parts. **Roughness 0.55** |
| Screen Navy | `#2C3A4E` | `M_ScreenNavy` | Screens, visors, doorways, solar panels. **Roughness 0.4** |

## 2. Ground and terrain

| Name | Hex | Material | Used for |
|---|---|---|---|
| Regolith Sand | `#E6CFB2` | `M_Regolith` | Tile tops, lunar ground |
| Regolith Dark | `#C9AD92` | `M_RegolithDark` | Rocks, crater rims |
| Rock Grey | `#B9A898` | `M_RockGrey` | Alternate rock colour |
| Crater Floor | `#B79C84` | `M_CraterFloor` | Inside craters |
| Tile Side / Cliff | `#9C7E6E` | `M_TileSide` | Sides of the hex display tiles |
| Scorch | `#6B5A55` | `M_Scorch` | Burn mark under the lander |
| Floor | `#D8CBB8` | `M_Floor` | Interior floor (dismantled workshop) |

## 3. Nature and garden

| Name | Hex | Material |
|---|---|---|
| Leaf | `#4FA35A` | `M_Leaf` |
| Leaf Light | `#8CCB5A` | `M_LeafLight` |
| Soft Green | `#9FD07A` | `M_SoftGreen` (food pack body) |
| Soft Green Dark | `#6FA85A` | `M_SoftGreenDark` (food pack lid) |
| Sage | `#6FB07A` | `M_Sage` (B.E.E.P. rack) |
| Mint | `#6FD1A6` | `M_Mint` (batteries) |
| Teal | `#33A9A0` | `M_Teal` (air tanks, canister band) |
| Soil | `#7A5040` | `M_Soil` |
| Wood | `#B9805A` | `M_Wood` |
| Wood Dark | `#8C5A3C` | `M_WoodDark` |
| Cardboard | `#E0A866` | `M_Cardboard` |

## 4. Research accent

| Name | Hex | Material |
|---|---|---|
| Lavender | `#9C86D6` | `M_Lavender` |
| Lavender Light | `#C8B9F0` | `M_LavenderLight` |
| Purple | `#6E5BB0` | `M_Purple` |

## 5. Special materials

| Name | Hex | Material | Settings |
|---|---|---|---|
| Glass | `#CDEBF0` | `M_Glass` | Alpha **0.35**, Roughness **0.1**, render method *Blended* |
| Pipe | `#D9D3E0` | `M_Pipe` | Roughness 0.5 |

## 6. Glow colours and their meaning

Emission colour = base colour. Keep glowing parts **small**.

| Glow | Hex | Material | Strength | Meaning |
|---|---|---|---|---|
| Teal | `#7EF2E0` | `M_GlowTeal` | 3 | **OK / active / powered / "alive"**: B.E.E.P.'s eyes, charge bars, status lights, windows |
| Amber | `#FFC857` | `M_GlowAmber` | 4 | **Attention / interactive / point of interest**: antenna bulbs, door lamps, valve dots, salvage highlight ring |
| Red-coral | `#FF7A5C` | `M_GlowRed` | 4 | **Alarm / locked / beacon**: lock timer "60", warning lamps, radio beacon, lander warning light |
| Pink | `#FF8FC8` | `M_GlowPink` | 3 | **Life and science**: grow lamps, research samples, probe tips |

Rule: teal = good, amber = look here, red = urgent. Do not use red for decoration.

## 7. Character colours

| Character | Main | Accent | Glow |
|---|---|---|---|
| Crew A | `#F2EBDD` (`M_Suit_CrewA`) | Terracotta `#E2683A` | Teal |
| Crew B | `#F4C05A` (`M_Suit_CrewB`) | Sky Blue `#4F8DC4` | Amber |
| Crew C | `#8FC9A8` (`M_Suit_CrewC`) | Purple `#6E5BB0` | Pink |
| B.E.E.P. | Cream | Terracotta + Sage rack | Teal eyes, amber antenna |

## 8. Item colour coding (signature colours)

Each cargo type has one dominant colour so it can be told apart quickly during the 60-second opening. Each also has a unique shape or icon, so colour is never the only cue.

| Item | Signature colour | Shape / icon cue |
|---|---|---|
| Portable battery | Mint `#6FD1A6` | Tall box, two terminals, lightning bolt |
| Food pack | Soft Green `#9FD07A` | Flat latched box, apple label, pouch on top |
| Air processing component | Off-white + Teal band | Tall canister, valve wheel, gauge |
| Maintenance kit | Terracotta `#E2683A` | Toolbox with handle, white cross, wrench |
| Garden kit | Wood `#B9805A` + terracotta pots | Open crate with 3 sprouting pots, watering can |
| Research equipment | Off-white + Purple `#6E5BB0` | Case with 3 glowing sample vials and a scanner |
| Small crate (1 tile) | Cardboard `#E0A866` | Taped cube |
| Long crate (2 tiles) | Sky Blue + Mustard corners | Long chest with arrow label |
| Large research crate (2 tiles) | White + Purple corners | Long chest with atom icon and window |

## 9. Puzzle-board colours

| Zone | Hex | Pattern |
|---|---|---|
| Normal tile | `#EADCC4` (`M_BoardTile`) | Plain |
| Board frame | `#B49A86` (`M_BoardFrame`) | n/a |
| Vent zone | `#5FA3DA` (`M_VentZone`) | **Stripes** |
| Service access | `#F4B23A` + `#FBE3A8` | **X mark** |
| Crew zone | `#7CC47A` (`M_CrewZone`) | **Round pad + white ring** |
| Route Top / Middle / Bottom | Terracotta / Teal / Purple | **1 / 2 / 3 dots + arrow** |

## 10. Sky and light colours

| Use | Hex | Strength |
|---|---|---|
| Background seen by camera | `#7FC1F2` | 1.0 |
| Ambient light from world | `#AFC9EA` | 0.75 |
| Sun (key) | `#FFE2B8` | 3.6 |
| Fill sun | `#BFD3FF` | 0.35 |
