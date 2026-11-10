# 04 · Lighting and Rendering

These settings reproduce the preview renders. A game engine should aim for the same feel: warm key light, cool ambient, saturated colours, bright sky.

## 1. Colour management (important)

| Setting | Value |
|---|---|
| Render engine | **EEVEE** |
| View Transform | **Standard** |
| Look | **None** |
| Exposure / Gamma | 0 / 1 |

Why: AgX ("Medium High Contrast" and "Punchy") was tested first and **desaturated the palette**. The cream turned grey and the terracotta looked dull. Standard keeps the Outlanders saturation.

## 2. World (sky + ambient) using the Light Path trick

The camera sees a bright sky colour, while the scene is lit by a softer, paler ambient colour.

```
Light Path [Is Camera Ray] ──► Mix Shader (Fac)
Background A  #AFC9EA, strength 0.75 ──► Mix Shader input 1   (lighting)
Background B  #7FC1F2, strength 1.0  ──► Mix Shader input 2   (what the camera sees)
Mix Shader ──► World Output
```

Python equivalent (excerpt from the project):

```python
lp  = N.new("ShaderNodeLightPath")
amb = N.new("ShaderNodeBackground"); amb.inputs[0].default_value = hexc("#AFC9EA"); amb.inputs[1].default_value = 0.75
sky = N.new("ShaderNodeBackground"); sky.inputs[0].default_value = hexc("#7FC1F2"); sky.inputs[1].default_value = 1.0
L.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
L.new(amb.outputs[0], mix.inputs[1]); L.new(sky.outputs[0], mix.inputs[2])
```

## 3. Lights

| Light | Type | Colour | Strength | Angle | Rotation (X, Y, Z) |
|---|---|---|---|---|---|
| Key "Sun" | Sun | `#FFE2B8` (warm) | **3.6** | **6°** (soft shadow edge) | 52°, 0°, −10° |
| "Fill" | Sun | `#BFD3FF` (cool) | **0.35** | default | 60°, 0°, −140° |

- The key comes from the camera's front-left, so the faces toward the camera are lit and shadows fall back and to the right.
- Keep the fill weak; most of the "cool" comes from the world ambient.
- Ray tracing / Fast GI was enabled when available for soft contact shading.

## 4. Camera

| Setting | Value |
|---|---|
| Type | **Orthographic** |
| View direction | From (+1, −1, 0.8–0.95) toward the target; Z rotation 45°, X rotation ~57° |
| Ortho scale | Fit to content with ~12% padding |
| Clip end | 200–500 |

Use **elevation 0.95** for wide sheets and overviews, and **0.8** for single-asset close-ups (shows more of the front).

The project's `render_set()` helper (see `06_pipeline_naming_export.md`) frames any set of collections automatically: it hides everything else, fits the ortho scale to the bounding box, centres it, renders, then restores visibility.

## 5. Output sizes used

| Render | Resolution |
|---|---|
| Overview | 1600 × 900 |
| Single-asset close-up | 1200 × 1200 |
| Contact sheets | 1600–2000 × 900–1100 |

Format PNG, saved in `moonshift_early/renders/`.

## 6. Matching the look in a game engine (e.g. browser / three.js / Unity)

| Blender | Engine equivalent |
|---|---|
| Key sun `#FFE2B8` 3.6 | Directional light, warm, soft shadows (PCF/soft), slightly long shadows |
| Ambient `#AFC9EA` 0.75 | Hemisphere or ambient light: sky `#AFC9EA`, ground a warm sand `#E6CFB2` at low intensity |
| Background `#7FC1F2` | Clear colour / skybox colour |
| Standard view transform | sRGB output, **no** filmic/ACES tone mapping (or a very gentle one) |
| Emission strength 3–4 | Emissive colour with a light bloom (threshold high, so only glow parts bloom) |
| Glass alpha 0.35 | Transparent material, depth-write off |

Optional Outlanders polish for later: a light blue distance fog/haze and a subtle tilt-shift blur on far areas.
