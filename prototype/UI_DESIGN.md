# UI, typography, and menu specification

Status: **planning only; implementation still requires approval.** This extends the three-shift scope without adding campaign selection, new scenarios, or a full settings application.

Use the original **Outlanders** as the primary reference for the interface as well as the world. Keep the settlement visible, place a small number of controls around its edges, and make contextual actions easy to reach. The developer/launch sources verify the intent to emphasize useful information and keep actions close at hand; the detailed treatment below is a MOONSHIFT adaptation. See [the research ledger](UI_REFERENCES.md) for source links and confidence labels.

**Every font choice, numeric dimension, color token, radius, timing, and screen arrangement below is an approximation for implementation.** No primary source reviewed supplies the exact in-game typography or design tokens. Full-resolution online menu inspection was unavailable, so these values must not be presented as measurements of Outlanders.

## Typography

Replace the earlier system-font-only proposal with two small, self-hosted families: **Lilita One** for display emphasis and **Nunito Sans** for readable UI. The local promotional references support compact, heavy display lettering, but do not establish the in-game family. Lilita One is the initial candidate to compare, not a verified identification. Nunito Sans is a readable provisional UI substitute, not a claim about the reference game's body font. [Font evidence and licenses](UI_REFERENCES.md#typography-findings).

### Proposed type scale

Sizes are CSS pixels at a normal 16 px root, expressed in rem in implementation. “Mobile” means a narrow viewport, not scaled-down desktop UI. Line height is unitless; spacing is in em.

| Role | Family | Actual weight | Desktop / mobile size | Line height | Letter spacing | Case and hierarchy |
| --- | --- | ---: | --- | ---: | ---: | --- |
| MOONSHIFT title | Lilita One | 400 | 56 / 40 px | 1.0 | 0.01em | Uppercase wordmark; single line where it fits |
| Main menu actions | Lilita One | 400 | 24 / 22 px | 1.1 | 0.02em | Short uppercase labels, such as Start shift 3, rendered as capitals |
| Dialog/result title | Lilita One | 400 | 30 / 26 px | 1.1 | 0 | Sentence case; one or two lines |
| Current shift objective | Nunito Sans | 700 | 22 / 20 px | 1.2 | 0 | Sentence case, visually stronger than its shift label |
| Panel/section heading | Nunito Sans | 700 | 20 / 18 px | 1.25 | 0 | Sentence case |
| Gameplay button/toggle | Nunito Sans | 700 | 18 / 18 px | 1.2 | 0.01em | Sentence case; stable action wording |
| Resource number | Nunito Sans | 700 | 22 / 20 px | 1.1 | 0 | Tabular numerals if provided by the prepared font |
| Body/instructions | Nunito Sans | 400 | 18 / 18 px | 1.45 | 0 | Short paragraphs, normally no more than 45–60 characters per line |
| Resource/shift label | Nunito Sans | 600 | 16 / 16 px | 1.25 | 0.01em | Sentence case; keep beside the associated value |
| Optional hint/shortcut | Nunito Sans | 400 | 14 / 14 px | 1.35 | 0 | Supplementary only; never the sole explanation of a required action |

Lilita One's real 400 cut is already heavy; do not request a synthetic 700/900 weight. Use real 400/600/700 values from Nunito Sans, disable synthetic bold/italic, and start its width at 100% with automatic optical sizing. Do not use excessive tracking to imitate a display face or force uppercase on instructions.

Fallbacks: display uses `"Lilita One", "Arial Rounded MT Bold", sans-serif`; UI uses `"Nunito Sans", system-ui, sans-serif`. Font fallback must leave every action usable. Fixed minimum control heights must allow extra text lines rather than clipping when fonts swap or text zoom increases.

### Matching workflow after approval

First compare real reference glyphs and word widths, then tune family/weight, cap height, line height, tracking, and hierarchy in that order. Use actual menu words and numbers at matched viewport sizes; do not identify a font from a logo alone. Keep each adjustment in shared tokens. Record reference frame, proposed family, measured/estimated differences, and unresolved mismatches. If an original font is later verified and usable, replace the candidate centrally.

Do not promise an exact reproduction before that comparison. Child-readable text and complete labels take priority when a reference's apparent text size would be too small on the target phone.

## Layout and surface tokens

These are initial MOONSHIFT values, harmonized with [the existing palette](../design_theme/02_color_palette.md), rather than colors sampled from Outlanders screenshots.

| Token | Initial value | Use |
| --- | --- | --- |
| Ink | `#2C3A4E` | Text, filled glyphs, strong control edges |
| Panel | `#FFF6E8` | Opaque readable panels and menus |
| Secondary surface | `#F7E6C8` | Secondary buttons and grouped controls |
| Primary action | `#F4B23A` with ink text | Start, Run shift, Continue; one dominant action per panel |
| Selected action | `#E2683A` with ink text and check/outline | Selected tabs/actions, after contrast verification |
| Focus | `#215D9C`, 3 px ring with 2 px offset | Keyboard focus, distinct from selection |
| Status accents | Existing teal / amber / coral / pink | Small symbols plus explicit status text; no color-only state |
| Spacing | 4, 8, 12, 16, 24, 32 px | Icon gaps, rows, padding, and screen gutters |
| Corners | 8 px buttons; 12 px panels | Soft geometric silhouettes; reserve circles for compact utility controls |
| Elevation | 1 px ink-tinted edge, subtle 2–3 px bottom shadow | Tactile separation without a glossy/web-dashboard treatment |

Keep paragraphs left-aligned. Center only the title/menu group and short button labels where the composition calls for it. Avoid full-screen grids of cards. Panels should be flat, lightly framed, and readable; do not import wood textures, ornate frames, glass blur, or heavy gradients into the UI.

### Desktop HUD, initial composition

At 1280×720, start with 24 px outer gutters, a top status area approximately 88 px tall, and a contextual panel 300–340 px wide near the lower-left. Position the commit button near the lower-right, away from the board's pick surfaces. These dimensions are adjustable estimates, not reference measurements.

```text
+------------------------------------------------------------------+
| Shift 3: Store cargo              Food 3   Power 1       [Pause]   |
| Keep one air route available.                                     |
|                                                                  |
|                  Elevated isometric outpost                      |
|                     3×3 board in clear view                       |
|                                                                  |
| +----------------------------+                                   |
| | Cargo: Battery / Research  |           [−] [View] [+]             |
| | Selected item, footprint   |                                   |
| | Rotate / Cancel            |         Preview: 2 rations remain  |
| | Placement or route reason  |                    [Run shift]     |
| +----------------------------+                                   |
+------------------------------------------------------------------+
```

Use the same panel position for selected cargo, fan, garden, workshop, or radio. Show only actions meaningful in the current shift. Keep the objective stable when a panel opens. Food/power indicators show the **committed** state, while explicitly labeled preview rows show projected changes; do not silently mix the two.

The small HUD and contextual-panel pattern is informed by the indexed gameplay references in [R6/R7](UI_REFERENCES.md#source-ledger). The exact positions above and the commit/preview system adapt it to MOONSHIFT's turn-based rules. Do not copy Outlanders' continuous time-speed controls into a game with no running simulation clock.

### Phone and tablet

Below roughly 760 px, use a compact two-row header, the framed 3D scene, and a **nonmodal bottom action region** in normal layout flow. The canvas receives the remaining measured space; UI must not obscure the active board. Use 12–16 px side gutters. Place the DOM grid and controls in the action region, and keep Run shift reachable without horizontal scrolling.

On short screens, let the controls scroll while maintaining a useful scene height, rather than shrinking all text or covering the world with a tall floating sheet. Recalculate raycast coordinates from the canvas's actual rectangle after scroll/resize. Respect safe-area insets and dynamic viewport height. A tablet can retain the desktop composition only when both the board and text remain comfortably usable.

## Menu flow and screen designs

These layouts and labels are **prototype adaptations**, not verified replicas of Outlanders menus. A small start screen, reusable dialog shell, and shared action panel are sufficient.

| Screen/state | Contents and visual treatment | Navigation and behavior |
| --- | --- | --- |
| Title/start | MOONSHIFT in the display face over the outpost or a lightweight local poster. One narrow vertical action group: **Start shift 3**, **How to play**, **Settings**. A short subtitle identifies this as a three-shift prototype. | Start opens the brief setup, then S3. No disabled Campaign/Sandbox/Continue entries for features the prototype does not have. On desktop keep a large clear view of the island beside the menu; on phones use an upper scene area and a lower menu area. |
| Briefing | One compact panel explaining the supplied cargo, the already-installed garden, and the goal of keeping three crew safe and fed. Three short steps: Store cargo → Shelter crew → Prepare supplies. | **Begin** enters S3; **Back** returns to the title. No extra mode selector or timer. |
| How to play | Three illustrated rows using the project's own item/route symbols: select then place, spend limited power, preview then run a shift. Include keyboard instructions. | **Back** returns to the opening menu or pause dialog that launched it. No manual carousel or separate help application. |
| Pause | Centered ivory panel over a simple translucent scrim; **Resume**, **How to play**, **Settings**, **Restart slice**, **Return to title**. | Pause freezes presentation effects. Resume restores focus. Restart/return asks for confirmation if the run would be lost. No persistent save is implied. |
| Settings | Native labeled controls for **Reduced motion** and **Low graphics**; one **Done** button. Descriptions state their effect. | Available from title and pause; remember preferences locally. No audio control while audio is outside scope. Settings themselves do not spend a shift. |
| Selected object | Facility/item name, small original icon or prepared thumbnail, current state, allowed actions, and one actionable reason when blocked. | Picking a model or choosing its labeled DOM control opens the same panel. Close returns to the scene without changing the committed state. |
| Risk confirmation | One direct title, specific consequences, and two clear actions: e.g. **Return to plan** and **Continue without shelter**. | The safe return action receives initial focus. Require explicit confirmation; Enter from the previous screen cannot accidentally confirm. Hard validation failures remain blocking. |
| Shift result | Preserve the island behind a compact panel. Show objective result first, then food/power/item changes and a short crew response. | **Continue** opens the next shift. Skip feedback reaches this same result; it does not run another shift. |
| Slice summary | Storm protection, food reserve, branch readiness, research/message status, and one actual cause/effect. Main action **Try another plan**; secondary **Return to title**. | Replay restores the original S3 snapshot. Do not show pickup confirmation or full-game endings. |
| Loading/error | Immediate text status and simple progress, with a poster only if it meets the asset budget. | Enable play only when the scene is ready. On failure show **Retry** and a usable route to the title; preserve any committed run state during recovery. |

Menus should open in about 120–180 ms using opacity and a small displacement, with no bounce. Reduced motion removes displacement. Do not blur or continuously re-render the 3D scene behind a modal just to animate a menu.

## Buttons, states, and icons

Use native DOM buttons with at least **44×44 px** targets; start main actions at 48 px high and title-menu actions at 52 px. Use 16–20 px horizontal padding, an 8–12 px icon/label gap, and label-based widths. Utility glyphs are 20–24 px inside a 44 px target. Keep one primary filled action; secondary buttons use ivory/cream with an ink outline.

| State | Required visible and behavioral response |
| --- | --- |
| Default | Clear label, light surface, strong silhouette; no permanent motion |
| Hover | Slight surface/edge change on pointer devices; never the only explanation |
| Pressed | Immediate darker/bottom-edge change; at most 1 px displacement |
| Selected | Persistent check/filled marker and outline plus text state; distinct from keyboard focus |
| Keyboard focus | Visible focus ring around the whole hit target; no layout movement |
| Unavailable | Muted treatment plus a readable reason such as “Needs one more power”; make that reason keyboard-accessible |
| Resolving | Stable-width “Running shift…” label and blocked duplicate execution; keep Skip feedback usable |
| Invalid action | Preserve the last valid draft and explain the exact cell, route, or budget problem beside the action |

Draw a small original SVG icon set using **filled, chunky silhouettes**, one consistent 24-unit grid, limited internal detail, and ink/ivory contrast. This is an approximation of a simple strategy-game pictogram language; exact Outlanders glyph geometry has not been verified. Avoid mixing thin outline-library glyphs, emoji, and raster screenshots. No icon font or full icon-library payload is needed.

| Meaning | Proposed glyph and companion label |
| --- | --- |
| Food | Ration pack, paired with a numeric count and “Food” |
| Flexible power | Plug/lightning symbol, with used/available units and “Power” |
| Cargo | Crate silhouette; battery and research use distinct shapes |
| Ventilation | Broad arrow through a vent grille; label route and availability |
| Crew shelter | Three helmet dots inside a thick-walled room; explicit sheltered/not sheltered text |
| Garden | Sprout with 1/2 care progress and harvested state |
| Research | Sample vial; distinguish prepared from sent with text/check state |
| Radio | Dish and signal arcs; explicit power/message status |
| Utility | Gear, pause, close, rotate, plus/minus, and help symbols with accessible names |

World indicators reuse 1/2/3 route dots, arrows, and the same status vocabulary. Large illustrated item images come from the project's own prepared GLBs. Do not ship reference-game logos, screenshots, or traced icons as interface assets.

## Implementation and fidelity checks after approval

Implement the UI in React/HTML/CSS over the existing single 3D canvas. Use shared tokens and components for `MenuButton`, `ActionButton`, `ResourceCounter`, `ContextPanel`, `Dialog`, and `ResultPanel`; these are planned boundaries, not a requirement to introduce a component library.

- Prepare local WOFF2 fonts with Latin coverage for English/Indonesian and needed punctuation. Target **80 KiB combined font transfer**, within the existing 2 MiB total first-play budget. Start with one display cut and one limited UI variable file, or measured static subsets if smaller. Keep license notices. Verify any subset naming against the upstream license.
- Preload only the body font if it improves measured readiness; use `font-display: swap`. The title font must not gate input or the GLB loading path. Avoid remote font CSS and duplicate font requests. Test fallback and late font loading explicitly.
- Make dialogs semantic, label them, move focus into them, trap focus within the active modal, and return it to the invoking control. Keep the nonmodal action region out of that trap. Ignore canvas actions while a modal is open.
- Test text/background pairs to at least 4.5:1 for ordinary text and controls/focus indicators to at least 3:1 where applicable. Increase text size or darken the treatment if an accent pair fails; scene glow colors do not automatically qualify as text colors.
- Compare the title, pause/settings, HUD, selected-object panel, and confirmation at 1366×768 and 390×844. Separate original-game observations from deliberate MOONSHIFT changes in the review notes.
- Check font family/real weight, apparent cap height, line wrapping, spacing, menu alignment, icon consistency, selected/focus distinction, and world visibility. Capture reference/prototype pairs when reference pixels become available; do not manufacture a similarity score from unmeasured screenshots.
- Repeat keyboard-only, no-hover touch, 200% text zoom, reduced motion, and narrow/short-screen checks. Test long labels such as “Continue without shelter” without truncating their meaning.

The fidelity target is the closest supported match to the original game's visual language with documented substitutions. The original family, exact menu geometry, and pixel-level fidelity remain open verification items; the interface should still be fully usable and visually coherent with the low-poly outpost.
