# MOONSHIFT browser prototype plan

Status: planning complete only when the linked asset, technology, and validation plans are ready. Implementation requires explicit approval.

This prototype will test whether the existing low-poly assets can support a clear, enjoyable browser game. It is a small playable slice of the team's provisional NASA Space Apps Challenge design, rather than the complete six-shift game.

## Planning documents

- [Asset audit and preparation](ASSETS.md): inspected files, reuse strategy, and required corrections.
- [Technology decision](TECHNOLOGY.md): current alternatives, recommended stack, and architecture.
- [Milestones and acceptance checks](VALIDATION.md): implementation sequence, playtests, and browser performance gates.

## Scope and feasibility question

Build one compact lunar outpost and the connected **S3 → S4 → S5** sequence. Target a first session of **3–5 minutes**, with immediate replay. This follows the brainstorming document's proposed build order and exposes the relationship between storage, ventilation, power, food, and research.

The prototype should answer four questions:

1. Can a player understand and select the existing assets from an elevated isometric view?
2. Is arranging cargo, seeing its consequences, and committing a plan satisfying?
3. Can the scene load quickly and remain responsive on an ordinary laptop and phone?
4. Can the art be adapted with small preparation steps rather than extensive remodeling?

These are hypotheses to test. Asset inspection supports feasibility; browser performance and enjoyment have not yet been demonstrated.

### Included

- One brief introduction, one persistent 3D outpost, three shift results, a slice summary, and replay.
- B.E.E.P., three astronaut models, habitat, workshop, garden, radio, main air unit, branch fan, and a 3×3 cargo board.
- One battery occupying one cell and one research crate occupying two adjacent cells.
- Select-and-place cargo controls, crate rotation, three alternate ventilation routes, draft preview, and one-time shift resolution.
- One flexible power unit each shift; one disposable battery can add one unit on S4 or S5.
- Storm preparation, a crew movement order, two-turn garden progress, food consumption, one S5 job, and one S5 message.
- Pointer, touch, and keyboard operation; reduced motion; a short contextual hint; explicit loading and recovery states.

### Deferred

Cargo selection, the 60-second challenge, S1's pipe puzzle, S2's workshop decision, S6 pickup, the full ending system, and the NASA archive remain outside this slice. Also defer free building, continuous production, pathfinding, physics, full character rigs, audio, live data, accounts, saved sessions, and elaborate weather effects.

Do not add a second scenario, extra cargo, or a camera system to make the demo look larger. Measure this slice first. The modest cargo count tests readability and interaction; it does not establish the depth of the final storage puzzle.

## Starting scenario

Start immediately before S3 with a coherent snapshot of earlier decisions:

| State | Value and reason |
| --- | --- |
| Earlier cargo | I01 battery + I04 garden kit + I05 research crate = 4 transport slots |
| S1 | Main air repaired; I03 not brought, so the middle route remains locked |
| S2 | Workshop retained; garden kit installed; one garden care turn completed |
| Crew | Three astronauts at the habitat, controlled as one group |
| Food | 3 team rations before S3; S1 and S2 consumed one each from the original 5 |
| Storage | Battery and research crate in the placement tray; installed kit occupies no storage cell |
| Power | 3 base units: 2 reserved for main air and 1 flexible; unused power does not carry over |
| Other state | Garden not harvested; battery unused; research not prepared; no missed meals; correction profile enabled |

The summary should explain this setup in one short paragraph. Players do not have to learn the omitted shifts before playing.

## Core loop

**Read one objective → inspect the outpost → edit a reversible plan → see the predicted result → run the shift → watch the consequence → continue.**

Nothing is consumed while arranging a plan. Preview and execution use the same rule evaluator. A short animation communicates a committed result; no timed input is required.

| Step | Player decision | Required behavior |
| --- | --- | --- |
| S3: Store the cargo | Place the battery and rotate/place the research crate | Reject overlap and out-of-bounds placement. Require all cargo stored and at least one available route before commit. Consume one ration: 3 → 2. |
| S4: Shelter the crew | Adjust cargo, choose a route, power the fan, order all crew to shelter; optionally use the battery to also tend the garden | A route, fan power, and movement order are separate requirements. Confirm proceeding without protection. Garden care can produce +2 food before the ration is consumed. |
| S5: Prepare for the last shift | Ensure food, choose research preparation or an eligible air-route correction, and allocate power to garden/radio/fan | At most one job and one message. Research may be prepared and sent in this shift. A second garden turn harvests once. Manual cargo moves are locked. |
| Slice summary | Inspect consequences and replay | Show storm protection, meals, food reserved for S6, branch readiness, and research/message results. Explain one actual decision chain. |

At S5 the radio can send a station report or prepared research. It does not request pickup. Air-route correction requires an available route, one job, and one fan power unit; it repairs readiness without changing S4's recorded protection outcome. If the branch was ready but the player omitted the crew movement order, correction is unavailable.

For example, use the battery in S4 for fan + garden: food progresses **3 → 2 → 3 → 2**, the crew shelters, and S5 can power the radio and send research. Alternatively, save the battery for S5: fan only in S4, then garden + radio in S5 yields the same final food and research result. Leaving research unsent remains a valid crew-first outcome.

The slice reports **Ready for the final shift** when the crew sheltered, no meal was missed, and at least one ration remains after S5. Otherwise it reports **Needs another plan** with the recorded causes. Research is a separate bonus. Neither label claims pickup has occurred or replaces the full game's endings.

### Rules that must remain intact

- A2, B2, and C2 are air openings. The middle opening additionally needs the omitted S1 connection, so it is visibly locked in this scenario.
- Available ventilation, a powered fan, and crew relocation are distinct states. Crew use one separate corridor and shelter door.
- Shelter walls reduce radiation exposure; the fan supplies air. The prototype calculates no radiation dose.
- Food additions precede the end-of-shift meal. One ration feeds all three astronauts. Food never becomes negative.
- S3 requires a viable route; S4 can proceed unsheltered only after confirmation. Both require every remaining item to be stored.
- S5 forecasts both remaining meals. A shortfall can be acknowledged, and the result must reflect it.
- The research crate stays in storage after research is sent. A consumed battery frees its cell.
- Canceling battery use restores its previous cell when free; otherwise return it to the tray during S4 and block commit until placed. In S5 placement is locked, so restoration is straightforward.
- Commit is idempotent: repeated clicks or Enter presses cannot consume a second ration or battery.

## Visual direction and game feel

Use **Outlanders** as the primary reference for the miniature settlement, quiet observation, chunky silhouettes, clear actions, and small visible consequences. The [official game page](https://www.pomelogames.com/outlanders/) and the local [reference images](../references/) inform this direction. The camera treatment below is an adaptation for MOONSHIFT, not a claim about the reference game's engine or exact projection.

Compose one shared sand-colored island with the cargo board near the front, habitat and shelter behind it, and garden/workshop/radio around the sides. Avoid arranging every model on its own showcase pedestal. B.E.E.P. moves briefly toward the selected work area; the astronauts move together along a fixed corridor when ordered. The board and the chosen route remain visible during the storm result.

Preserve [the project's art direction](../design_theme/01_art_direction.md): flat-shaded bevels, texture-free materials, cream `#F7E6C8`, terracotta `#E2683A`, sand `#E6CFB2`, sky `#7FC1F2`, and navy `#2C3A4E` for depth and readable text. Teal means active, amber requests attention, coral marks an alarm, and pink accents science. Labels, shapes, and patterns always accompany color.

Use the system rounded sans-serif stack with a system sans-serif fallback, sentence-case labels, and large controls. This keeps text familiar and avoids a font download. Keep decorative UI quiet so the outpost is the main visual. Show one goal, food and power counts, and a compact action panel; technical diagnostics belong behind a development-only toggle.

### Camera

- One orthographic camera, roughly 45° around the island and **35–45° above the ground**, initially around 40°. This avoids ambiguity between elevation and Blender camera Euler rotation.
- In Three.js Y-up coordinates, begin on the asset-front side around `(d, 1.2d, d)` looking at the island center; verify silhouettes against the renders before finalizing. Imported GLB fronts face +Z.
- Fixed azimuth and elevation. Two bounded zoom buttons and a reset view are enough; no free orbit, camera collision, or drag-to-pan.
- Frame the whole useful play area on desktop. On phones, switch to a closer board framing during placement and a wider framing for shelter results, with an explicit overview button.
- Resize the orthographic frustum to the available canvas rectangle, accounting for the action panel. Keep the selected cell and its destination visible. Reduced motion makes focus changes immediate.

### Controls and feedback

| Input | Action |
| --- | --- |
| Click/tap an item, then a cell | Select cargo and place it; preview its full footprint before committing placement |
| Rotate button or R while cargo controls are focused | Rotate the two-cell crate around the logical anchor; reject invalid rotation without losing the last valid draft |
| Click/tap a facility or its labeled action button | Open its small contextual action panel |
| Tab, arrow keys, Enter/Space | Navigate labeled controls and the equivalent 3×3 DOM grid; perform every game action without canvas pointing |
| Escape or Cancel | Close the active panel or cancel selection; preserve the committed state |
| Run shift | Validate, request a risk confirmation when needed, resolve once, then show the result |

Use generous invisible pick surfaces rather than tiny decorative meshes. The DOM grid mirrors the 3D board through the same action dispatcher and displays coordinates, occupancy, route state, and focus. Route controls have text labels and 1/2/3-dot markers. Do not require hover or drag gestures. Use at least 44×44 CSS-pixel controls; on narrow screens let the DOM grid handle cells too small to tap reliably in 3D.

Selection needs an immediate outline/footprint and a clear invalid-placement reason. Commit animations should take about 0.5–1.5 seconds, remain skippable, and expose the same facts in a static result panel. Warm lighting and readable route arrows continue during the storm; avoid a dark screen, flashing effects, or a particle cloud that hides the puzzle.

## Planning boundary

Only Markdown planning files are authorized in this phase. Review the linked documents together; approve the proposed slice and stack before installing dependencies, preparing derived assets, scaffolding the app, or writing gameplay code. Implementation will remain within `prototype/`, with small meaningful commits and checks at each milestone. No deployment is part of this plan.
