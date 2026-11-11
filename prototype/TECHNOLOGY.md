# Technology decision

Research checked on **2026-11-11** against official project documentation and release pages. This is a fit assessment for the three-shift prototype, not a benchmark ranking. Recheck stable versions and peer dependencies when implementation is approved; commit exact resolved dependencies and the lockfile.

Implementation uses pinned React/React DOM **19.3.0**, Fiber **9.8.2**, Three.js **0.187.0**, Vite **8.3.7**, TypeScript **7.0.2**, Vitest **5.1.0**, and Playwright **1.65.0**, resolved from npm. The available Node **22.14.0** satisfies the toolchain; no global runtime upgrade was needed. The lockfile records the complete dependency set. Browser outcomes are recorded in [validation](VALIDATION.md).

## Recommendation

Use **TypeScript + React + React Three Fiber + Three.js + Vite**, with a **WebGL 2** renderer, native HTML/CSS controls, and local deterministic game state. Build static files; no server runtime is needed.

The small extra framework cost is justified by repeated draft/preview/result UI, accessible controls, and scene changes driven by the same state. React also matches the team's initial technical proposal. The 3D library renders the outpost; HTML handles readable controls, dialogs, focus, and loading states. A second canvas UI framework would duplicate that work.

### Maintained choices and tradeoffs

| Option | Current maintenance evidence | Fit and decision |
| --- | --- | --- |
| Three.js directly with TypeScript/DOM | Official releases show r187 dated October 30; the current loader supports glTF assets. [Releases](https://github.com/mrdoob/three.js/releases), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) | Excellent lightweight alternative, with direct lifecycle control. It requires more manual synchronization between scene, draft controls, and result panels. Choose it if the UI later shrinks to a single simple interaction. |
| React + React Three Fiber over Three.js | React documents 19.3; Fiber's stable 9.x release line has recent fixes and React 19.3 compatibility. Fiber 10 is currently alpha. [React versions](https://react.dev/versions), [Fiber releases](https://github.com/pmndrs/react-three-fiber/releases), [compatibility](https://r3f.docs.pmnd.rs/) | **Selected.** Fast iteration on stateful UI and reusable models. Adds React/reconciler downloads and lifecycle/cache rules. Use stable Fiber 9.x and keep per-frame animation outside React state. |
| Babylon.js | Version 9.0 was announced March 26, 2026, with continued engine development. [Official announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/) | Strong integrated engine and tooling. Attractive for richer animation, physics, and larger scenes; those capabilities are outside this slice. Modular imports can control payload, so do not dismiss it as inherently slow. |
| PlayCanvas Engine | Its official releases list maintained 2.x updates; the engine supports npm/ES modules and WebGL 2. [Releases](https://github.com/playcanvas/engine/releases), [engine overview](https://playcanvas.com/products/engine) | Viable browser-first alternative, especially for an editor-centered art workflow. This repository already has prepared GLBs and needs a code-driven UI; adopting another scene workflow offers limited savings here. The engine can also be used without its hosted editor. |
| PixiJS + isolated isometric sprites | Official documentation lists a maintained stable 8.x line. [Versions](https://pixijs.com/versions) | Good fallback for a fixed-view 2D game. Requires new isolated renders, manual depth sorting, camera limits, and separate sprite states. Existing sheets are not sprite atlases. It tests a different integration path than the available GLBs. |

There is no defensible cross-engine speed winner without implementing equivalent scenes. The selected stack minimizes the combined work of asset reuse, game rules, responsive UI, and testing. Switching engines is not the first response to poor draw-call discipline.

### Toolchain and dependency policy

- **Vite 8.3.x** is the currently regularly patched line. Use the React/TypeScript template and stable compatible plugins. Vite emits a static production build. [Supported releases](https://vite.dev/releases), [guide](https://vite.dev/guide/).
- **React/React DOM 19.3.x, Fiber 9.8.x, and Three.js r187** are the researched starting candidates. Confirm actual peer ranges and loader behavior together, then pin exact working versions. Match `@types/three` to Three.js. Do not adopt Fiber 10 alpha for the demo.
- Use the current stable **TypeScript** supported by that toolchain, strict checking, npm, and a committed `package-lock.json`. Keep one package manager and a reproducible clean install.
- Prefer the latest patched **Node.js 24 LTS** for a mature supported toolchain; Node 26 is also LTS. Avoid obsolete Node 20 even though the Vite guide still lists its minimum compatibility. [Node release status](https://nodejs.org/en/about/previous-releases).
- Use **Vitest** for rules and **Playwright** for a small set of real browser flows. These are development dependencies. Choose current stable releases compatible with the selected Vite/Node versions. [Vitest guide](https://vitest.dev/guide/), [Playwright browsers](https://playwright.dev/docs/browsers).
- Start without Drei, a global state library, physics, postprocessing, an animation framework, a router, or a UI kit. Add a narrowly imported helper only if it removes real work. No runtime CDN imports or remote asset dependency.
- Follow [the UI specification](UI_DESIGN.md) for two small local WOFF2 font resources and original inline SVG icons. Font transfer has an 80 KiB target within the existing first-play budget; no external font service or icon font is required. Exact Outlanders font identity remains unresolved in [the research notes](UI_REFERENCES.md).

Version claims above describe the research date, not a promise about versions available when work resumes. No package installation is part of planning.

## Rendering choice

Use Three.js `WebGLRenderer`, which requires WebGL 2; current Three.js does not support WebGL 1. [Renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html).

Use one canvas and one persistent scene. Begin with sRGB output, no filmic/ACES tone mapping, a warm directional key, a cool hemisphere fill, flat material normals, and the project's bright sky. Blender's numeric light strengths do not transfer directly; tune by comparison with the renders. Keep emissive accents visible without a bloom pass. Start with cheap opaque contact patches under models; allow one modest shadow map on desktop only after profiling shows headroom.

WebGPU is not required for this modest scene. Supporting a second renderer/material path adds validation work without solving the observed many-mesh problem. Do not silently promise a WebGL 1 or fully playable 2D fallback: if WebGL 2 is unavailable, show a DOM explanation, a lightweight poster if available, and a retry action.

## Minimal architecture

After approval, keep the application isolated under `prototype/`:

```text
prototype/
  README.md, ASSETS.md, TECHNOLOGY.md, VALIDATION.md
  UI_REFERENCES.md, UI_DESIGN.md
  package.json, package-lock.json, index.html, vite.config.ts
  scripts/prepare-assets.*       # Explicit source allowlist; reproducible copies/preparation
  public/assets/                # Generated selected assets only
  src/
    game/                       # Scenario snapshot, types, evaluator, transitions, history
    scene/                      # Outpost, camera, model cache, cell picking, feedback
    ui/                         # Title/menus, intro, HUD, action panel, DOM grid, results
    app.tsx, main.tsx, styles.css
  tests/                        # Rule invariants and a few browser journeys
```

The game layer knows nothing about React or Three.js. `evaluate(committedState, draft)` produces validation issues, projected state, and effects. Preview and commit call that same evaluator; only an accepted commit replaces the committed state and appends a history entry. Shift and phase guard repeated execution. A reducer owns discrete game actions; context distributes this small state without introducing a store framework.

The scene receives state and emits the same actions as DOM controls. Model coordinates and raycasts never decide food, inventory, or route rules. Use hit planes keyed by cell/route/facility IDs, and reuse the mapping for keyboard focus highlights. While presentation is resolving, input cannot alter the committed result. Skip animation and reduced motion both reach the same result state.

## Loading, memory, and frame pacing

These measures are part of the initial implementation; more complex optimization follows measurements.

| Risk | Planned treatment |
| --- | --- |
| Slow first load | Render a small DOM shell immediately; split the 3D chunk; load only the 14-model manifest; reuse a promise/cache per URL; fetch with a small bounded concurrency, initially 4. Assets stay local to the build. |
| Shader/parse hitch on first action | Parse the required models, warm the initial scene's shaders using the pinned renderer's supported API, and render before enabling Start. Optional decoration can load later and must not block controls. |
| Excessive JS payload | Keep the dependency list short, inspect production chunks, and measure compressed transfer size. Lazy-loading moves work; it does not remove its cost from time-to-play. |
| Too many draw calls | Merge static parts by material, reuse shared materials/geometry, keep only actionable states visible, and measure total render calls including any shadow pass. Do not rebuild models per shift. |
| Retina/mobile fill-rate drops | Cap effective DPR, initially 1.5 desktop and 1.25 mobile, and internal resolution at 2 million pixels. A low-quality setting uses DPR 1, no dynamic shadows, and simpler glass. Lower resolution before sacrificing interaction feedback. |
| Allocation/React churn | Mutate animation refs in the render callback; use delta time and reused vectors. Update React state on actions/results, not every frame. [Fiber pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) |
| Idle battery drain | Use demand rendering; invalidate on input, resize, state changes, and each frame of short active animations. Stop when motion finishes. Pause presentation on a hidden tab and resume without applying a large elapsed-time jump. [Fiber scaling guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) |
| Memory growth on replay | Retain one loaded asset cache and one canvas across replays. Share immutable geometry/materials; reset game state and transforms. Bound history to three shifts. Cancel listeners, timers, and active animation callbacks on teardown. |
| Incorrect resource cleanup | Define ownership for cached assets versus per-instance state materials. Do not dispose shared cache resources when one clone disappears; explicitly dispose them on final teardown. Fiber unmounting does not replace an ownership policy for externally loaded objects. [Three.js cleanup](https://threejs.org/manual/pages/cleanup.html) |
| Glass overdraw/status ambiguity | Keep transparent layers few, use depth-write settings verified on actual devices, and offer opaque tinted glass in low quality. Avoid full-screen storm overlays and postprocessing targets. |
| Failed asset/context loss | Show the failing stage and Retry. Preserve the committed snapshot, reset renderer/asset ownership cleanly on recovery, and return to a usable result or planning phase. Never consume resources again during recovery. |

The table's first four rows require production network traces, load timings, chunk sizes, and renderer statistics; the remaining rows require frame profiles, replay/resource measurements, and failure-path checks detailed in [VALIDATION.md](VALIDATION.md). None has been measured in a running prototype yet.

Start with uncompressed GLBs because the selected source set is about 1 MB and contains no textures. Consider mesh compression only if measured transfer savings exceed decoder and decode overhead. Use ordinary HTTP compression for JS/CSS, static cache headers, and prepared asset fingerprints at hosting time; do not add a service worker or streaming system for this slice.

If performance misses the gates, first remove decoration, reduce DPR/shadows/transparency, and address submissions. If the scene still misses the real-device minimum, report the measurements and propose the sprite fallback before expanding scope.
