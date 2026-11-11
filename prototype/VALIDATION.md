# Implementation milestones and acceptance checks

Implementation was approved and the local three-shift prototype is playable. The original acceptance targets remain below; the following section distinguishes measured results from outstanding hardware and human checks.

## Recorded implementation results — 2026-11-11

Environment: Node 22.14.0, macOS 27.0.1, isolated Playwright browser profiles. The graphics backend available to Chromium is **ANGLE / SwiftShader software rendering**. No claim about a physical mobile GPU or a particular laptop GPU follows from these runs.

| Check | Result and limits |
| --- | --- |
| Rules | **Passed:** 14 deterministic tests, including the two battery strategies, food order, route constraints, unsafe outcomes, correction, preview purity, idempotent commit, and replay. |
| Type checking/build | **Passed:** strict TypeScript and a static Vite production build. The build enforces payload budgets. The approximately 991 KB minified 3D chunk produces a size advisory; its gzip transfer is approximately 264 KB and is included in the budget. |
| Browser flows | **Passed:** 20 checks across Chromium 158.0.8127.18, Firefox 159.0, WebKit 27.2, and emulated Pixel 7 at 390×844. They cover the full research path/replay, menu focus and settings, unsafe confirmation, actual 3D cell picking, and failed-model/font recovery. After the final crew-path and grid-alignment refinements, eight targeted gameplay/picking runs passed again. |
| Asset preparation | **Passed/measured:** all 14 prepared GLBs passed the Khronos glTF validator with zero errors and zero warnings. They total 813,876 bytes / 117 mesh primitives. The source exports are unchanged; hashes and transformations are in the manifest. |
| Build payload | **Measured:** approximately 341 KB gzip JavaScript, 41,748 bytes of local WOFF2 fonts, and 1.212 MB estimated total transfer. License files are conservatively included in the build-size total. |
| Cold loading with gzip | **Measured:** three 10 Mbps / 150 ms RTT runs reached play in 2,614 / 2,519 / 2,534 ms; median 2,534 ms. Required resource transfer was 1,206,981 bytes; DOM content readiness was 406–422 ms. |
| Warm loading | **Measured:** 987 / 994 / 975 ms; median 987 ms. A cache-disabled reload with 4× CPU slowdown took 2,538 ms; shader/browser caches may still differ from a first-ever device visit. |
| Render counts | **Measured summary state:** 131 draw calls, 13,416 triangles, 135 geometries, 1 texture, and 6 programs. These counts stayed unchanged after 20 replays. This records an observed state, not an exhaustive proof of every view's maximum. |
| Replay memory | **Measured:** comparable forced-GC JS heap samples were 8,994,316 and 10,200,664 bytes before/after 20 replays. Model requests remained at 14 total. This meets the initial growth threshold and shows no GPU-resource-count growth in that run; it does not prove the absence of all long-session leaks. |
| Idle/recovery | **Measured:** zero extra render frames during a settled 10-second idle interval. Forced WebGL context loss recovered with the same committed Shift 3 state and 3 rations. The UI can also recover from a failed model request. A forced no-WebGL-2 run displayed Retry and kept Start disabled. |
| Frame pacing | **Measured in software:** 40 contextual interactions spaced 750 ms apart yielded 1,606 samples, 24.9 ms median and 27 ms p95 render-callback interval. This misses the proposed desktop 60 fps timing target in SwiftShader; hardware 60 fps remains **unverified**. A separate empty-page/idle-page RAF check was approximately 16.7 ms. These are callback timings, not GPU presentation measurements. |
| Responsive rendering | **Measured:** the emulated 390×844 phone used a 487×453 drawing buffer, within the pixel cap, and had no horizontal overflow. Desktop/phone screenshots were visually inspected. Mobile device emulation does not certify Safari or Android hardware behavior. |
| Still unverified | Real iOS/Android devices, actual Chrome/Edge/Safari installations outside the test engines, previous major browser versions, the 1.6 Mbps failure/long-wait scenario, the 10-minute soak, and 3–5-person child/adult playtesting. Exact Outlanders font identity and pixel-level menu fidelity also remain unresolved. |

Run `npm test`, `npm run build`, and `npm run test:browser` from this directory. `npm run measure` serves the static build with gzip and collects a repeatable loading/replay/context/idle/frame report using an isolated Chromium profile. It writes its raw report and screenshots to `/tmp`; committed evidence is linked below. No account, backend service, or deployment is involved.

Evidence: [raw measurements](evidence/performance.json), [desktop storage view](evidence/desktop.png), and [phone title view](evidence/phone.png). The screenshots are development evidence and are not loaded by the game.

The playable core and asset path are feasible at this scale. Before expanding the six-shift game, test the actual target devices and observe first-time players. Keep the hardware frame-rate gate open rather than treating a software-rendered automation run as a hardware benchmark.

## Milestones

Keep each commit focused on one reviewable behavior. Run the relevant check before committing, and update this document with evidence as milestones complete. Do not bundle unrelated asset cleanup with gameplay changes.

| Milestone | Deliverable and suggested commit boundary | Exit check |
| --- | --- | --- |
| M0: Plan | Scope/asset audit; technology decision; interface research and UI specification; acceptance plan | Markdown links and measurements checked; verified evidence separated from approximations; implementation approval still required |
| M1: Prove the art path | Isolated Vite/React/TypeScript scaffold and lockfile; then explicit asset preparation; then a static outpost scene | Production build loads the selected GLBs on desktop and a phone. Verify board mapping, corrected markers, crate footprint, light/color, shelter/corridor, and no confusing duplicate facilities. Record original/prepared bytes, primitives, and initial frame cost. |
| M2: Prove the rules | Scenario snapshot and shared evaluator; then draft/commit/history transitions | Deterministic S3–S5 sequences pass the rule checks below, including replay and duplicate commit. No renderer is needed to run them. |
| M3: Play the loop | S3 selection/placement/rotation; then S4 power/route/crew orders; then S5 jobs/messages/summary | Complete the whole slice using pointer, touch, and keyboard. Preview matches each result; failed actions explain how to recover. |
| M4: Make consequences readable | Shared typography/buttons/icons and title/pause/help/settings menus; then short B.E.E.P./crew/fan feedback, contextual hints, responsive framing, and reduced motion | Follow the UI specification and review title, HUD, object panel, confirmation, and results against inspectable Outlanders references. A new player can tell whether the fan is powered, crew actually sheltered, food is sufficient, and research was sent. Skipping animation changes no result. |
| M5: Measure and harden | Loading/retry/context recovery; then measured performance fixes; then browser regressions | Network, memory/replay, browser, and frame-time gates pass or specific limits are documented. Commit fixes separately from the evidence report. |
| M6: Feasibility review | Playtest notes, representative screenshots, tested versions/devices, final measurements, and a go/revise decision | The prototype demonstrates the core loop and asset reuse. Record remaining risks before proposing the full six-shift game. |

M1 is the early feasibility gate: fix the source of an import, clarity, or performance failure before building extra screens. M3 is the first complete playable checkpoint. Additional polish is justified only by a specific readability or playability finding.

## Rule checks

Use small deterministic Vitest tests of outcomes and invariants, with a few end-to-end browser journeys. Do not write snapshots of every component or tests that merely repeat implementation expressions.

| Case | Expected result |
| --- | --- |
| Canonical route | S3: research at A1–B1, battery at C1. S4: top route + fan + crew order + battery + garden. S5: prepare research + radio + send research. Food after each shift is **2, 3, 2**; crew sheltered, harvest once, research sent, final-shift reserve sufficient. |
| Save the battery | Same storage. S4: route + fan + crew, keep battery. S5: battery + garden + radio + research job/message. Food is **2, 1, 2**; both routes demonstrate valid planning. |
| Crew first | S4 uses only the fan and crew order. S5 uses its one power unit for the second garden care turn; no radio. Food is **2, 1, 2**; crew readiness passes and research remains unsent. |
| Miss the food reserve | Do not finish garden care. Food after S5 is 0, no meal has yet been missed, and the summary explicitly forecasts the missing S6 ration. Never claim S6 has already failed or run it invisibly. |
| Occupancy | Reject an out-of-grid crate or overlap. S3 refuses unplaced cargo or no eligible route. In particular, research at A1–A2 plus battery at C2 blocks top/bottom while middle is locked. Rotate research to A1–B1 to recover. |
| Anchor and rotation | Both orientations occupy the correct two logical cells and physical cell centers. An invalid rotation retains the previous valid placement. |
| Cancel consumption after moving another item | Schedule the S4 battery, put research over its former cell, then cancel battery use. Battery returns to the tray; commit waits for placement or renewed consumption. |
| Power overrun | Three selected devices cannot run with only two flexible units after a battery. Canceling the battery with two devices selected preserves the draft but blocks commit until corrected. |
| Ready air, unmoved crew | A valid route and fan without the movement order produce branch-ready but unsheltered crew after explicit confirmation. S5 correction is unavailable. |
| Correction after an unsafe storm | With the branch unready and a valid route available, S5 correction needs one job and one fan power unit. Protection recorded in S4 stays false; selecting research simultaneously is rejected. |
| Single-use operations | One battery cannot be used twice; garden harvest occurs once; research preparation and transmission have the documented prerequisites and slot limits. |
| Preview, retry, and replay | Repeated commit input produces one result and one meal deduction. Preview changes no committed resource. Retry/context recovery does not replay consumption. Replay restores the exact S3 snapshot, cargo tray, crew, facilities, and empty history. |

## Playability and accessibility

Run an initial **3–5-person** formative test, preferably including the intended 7–12 age range where practical. Adult-only results must be labeled as a limitation. Observe a first play without coaching, then ask the player to explain the result.

- At least 4 of 5 testers, or 3 of 3 in a smaller pilot, identify the next action and complete the slice without facilitator intervention after the brief introduction.
- Aim for a 3–5-minute first run. Record slow points and misclicks rather than treating duration alone as success.
- Players should explain that cargo can block an air opening, powered air does not automatically move the crew, and the garden competes with other devices for power.
- Ask whether they want to try a different plan. Record this as early qualitative evidence; a tiny sample cannot establish long-term enjoyment or puzzle balance.
- Verify every action with keyboard only, visible focus, labeled dialog controls, focus return, and announced validation/results. Do not trap focus outside an open dialog.
- Check 200% browser text zoom, reduced motion, touch without hover, and labels independent of color. Use native buttons and a navigable DOM grid matching the 3D board.
- Selection, placement, toggles, and invalid-action feedback should appear within **100 ms** on target hardware. Disable repeated execution during resolving while keeping result reading and animation skipping responsive.
- Apply [the UI fidelity checks](UI_DESIGN.md#implementation-and-fidelity-checks-after-approval): verify real font weights, line wrapping, icon/state consistency, text contrast, and a clear view of the board. Keep the original font identity and menu geometry marked approximate until actual reference frames support a stronger claim.
- Exercise title → help/settings → back, pause → help/settings → resume, cancel/confirm restart, and summary → replay. Check modal focus handling and suppression of canvas input behind dialogs. Block font requests and repeat the key flows with system fallbacks; no clipped labels, shifted pick coordinates, or inaccessible controls.

## Browser and layout matrix

Support current stable and the previous major release of the major desktop browsers where an actual environment is available. Pin exact tested versions in the eventual evidence report rather than assuming that a JavaScript build target guarantees graphics compatibility.

| Environment | Required checks |
| --- | --- |
| Chrome and Edge on an integrated-GPU laptop | Cold start, full slice, mouse/keyboard, window resize, DPR change, and production build |
| Firefox desktop | GLB loading, raycast coordinates, focus, pointer behavior, and shader/material correctness |
| Safari on macOS | Loading, transparent glass, resize, tab suspension/resume, and complete slice |
| Real iPhone/iPad Safari | Touch selection, portrait/landscape, safe areas, viewport toolbar changes, memory/replay, and recovery after interruption |
| Real mid-range Android Chrome | Touch responsiveness, thermal/frame pacing, DPR limits, and cold loading over constrained network |
| WebGL 2 unavailable or context lost | Clear DOM recovery state; no blank canvas, locked loading screen, or duplicated game resolution |

Proposed reference classes: a laptop with integrated graphics and 8 GB RAM, a 4–6 GB Android phone, and an iPhone SE (2022) or similar. Record the actual CPU/GPU, RAM, OS, browser, viewport, and quality settings used. If a device/browser cannot be tested, mark that row unverified; desktop mobile emulation is not a substitute for mobile GPU or Safari behavior.

Check at least **360×640**, **390×844**, **768×1024**, and **1366×768** CSS pixels, plus one high-DPR desktop. No forced landscape. The action panel must not cover the active board; small phone layouts can scroll the DOM controls without moving or misaligning the canvas pick coordinates.

Playwright can cover deterministic flows in Chromium, Firefox, and WebKit when available. Its WebKit coverage does not certify a real iOS Safari device, and headless rendering does not prove GPU performance. [Supported browser tooling](https://playwright.dev/docs/browsers).

## Loading and runtime budgets

Measure the **production build**, served over HTTP, with debugging overlays disabled for final timing. Define time-to-play as navigation until the scene is visibly rendered, required assets and shaders are ready, and controls accept input. An early Start button alone does not satisfy the gate.

| Area | Initial gate | Method |
| --- | --- | --- |
| First-play transfer | At most **2 MiB** total required network transfer; JS at most **450 KiB gzip** and fonts targeted at **80 KiB combined** within that total | Cold-cache network trace with JS/CSS compression enabled; include models, fonts, poster, and thumbnail requests. Also report raw GLB bytes. |
| Time-to-play | DOM loading feedback within **1 second**; playable within **5 seconds** cold and **2 seconds** warm on the agreed reference laptop at 10 Mbps down / 150 ms RTT | Three cold and three warm production runs; record median and slowest. Apply 4× CPU slowdown on the laptop as an additional stress run, and separately test a real phone. Report uncompressed local-preview results separately. |
| Poor network | At 1.6 Mbps / 300 ms RTT, show useful progress immediately and complete or offer recovery without an indefinite spinner | Test a cold run, offline transition, one failed GLB request, and Retry. Do not promise the 5-second target on this connection. |
| Desktop frame pacing | Target 60 fps in active animation; median frame interval ≤17.5 ms and p95 ≤20 ms at the reference viewport | Profile a scripted 30-second sequence of placement, rotation, focus changes, and shelter movement. Exclude first-load compilation and intentionally idle demand-render periods. |
| Mobile frame pacing | Target 30 fps or better; median frame interval ≤33.5 ms and p95 ≤36 ms in low quality, without recurring stalls over 100 ms | Repeat the same active sequence on a real phone after several minutes of play; record heat/power conditions. |
| Scene complexity | Aim for ≤**150 total draw calls per rendered frame**, including shadows, and ≤**30,000 visible triangles** | Renderer statistics after merging and all procedural additions; record worst active view. A missed count budget prompts profiling rather than an unsupported claim of failure. |
| Render resolution | At most **2 million internal pixels**; bounded DPR; low-quality mode available | Record drawing-buffer dimensions on high-DPR screens and after orientation changes. |
| Replay memory | After cache warm-up, geometry/texture/program counts stabilize over **20 replays**; JS heap target ≤**128 MiB** and final comparable post-GC samples within **10% or 10 MiB**, whichever is greater, of the warmed baseline | Browser memory tools where supported, renderer counts, and a 10-minute interaction soak. Compare identical summary states; inspect any repeated upward trend even under the size target. |
| Idle/background | No continuous render loop after feedback ends; no gameplay advance while hidden | Profile 10 seconds idle and 30 seconds in another tab, then return. Ensure animation time is bounded and controls recover. |

JS heap is not total tab or GPU memory. Renderer counts do not measure GPU bytes. Record process/GPU observations where the browser exposes them, plus canvas buffers, shared geometry, and any decoded images; do not invent a portable total-memory figure. A memory leak is still a failure even if the absolute heap target has not yet been exceeded.

If a budget fails, capture a trace before changing anything. Reduce optional geometry and submissions first for CPU pressure; lower DPR/shadow/glass cost for GPU pressure; remove oversized resources for loading/memory pressure. Retest the changed path and a complete run. Do not rewrite the renderer or add workers as a speculative first fix.

## Completion evidence and decision

After approval and implementation, record commands/results for type checking, rule tests, production build, and browser journeys, alongside network timings, frame intervals, replay memory observations, device versions, and representative screenshots. Every result must say measured, failed, or unverified. These records can be added to this file without creating a separate reporting application.

Recommend extending toward the full game only when the slice is understandable, its existing models work as interactive objects, the crew/food decisions resolve correctly, and the minimum device gates are met. If mechanics are clear but puzzle depth is weak, adjust scenario balance before expanding systems. If the 3D scene remains too costly after targeted fixes, bring measured evidence to a review of the prepared-sprite fallback.
