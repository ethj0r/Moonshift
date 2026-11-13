# MOONSHIFT browser prototype

Status: **branch `gdd-v2` implements GDD v2** ("Panduan Cepat versi 2" + "Desain Interaksi untuk Anak"). The whole session is playable: cargo opener, shifts S1–S5, pickup, and a three-screen debrief, in a third-person view where B.E.E.P. walks around the outpost and does things by hand.

## Run locally

Use Node.js 22.12 or newer and npm. From the repository root:

```sh
cd prototype
npm ci
npm run dev
```
n
Open the printed local URL, normally `http://127.0.0.1:5173`. Development and production builds prepare the selected models and local fonts automatically. Generated copies are ignored; the source exports remain unchanged.

Pick a pilot card (Cadet or Specialist), then **Mission 1**. Walk with WASD/arrows or tap the ground; press **E** or tap an amber-ringed object to use it. **Walk to…** lists every usable object for keyboard, switch, and screen-reader players. Preferences and badges persist locally; the active run is held in memory.

```sh
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
npm run measure
```

The build includes a payload-budget check. Browser tests use isolated profiles. The optional measurement command serves the production build with gzip on port 4174, collects loading/replay/rendering evidence, writes `/tmp/moonshift-performance.json`, and shuts down its test server. Headless and emulated-phone results do not certify real-device GPU performance.

## Planning documents

- [Asset audit and preparation](ASSETS.md): inspected files, reuse strategy, and required corrections.
- [Technology decision](TECHNOLOGY.md): current alternatives, recommended stack, and architecture.
- [Outlanders interface research](UI_REFERENCES.md): verified sources, inspected promotional art, and unresolved font/menu details.
- [UI and menu design](UI_DESIGN.md): typography, screen layouts, buttons, icons, responsive behavior, and fidelity checks.
- [Milestones and acceptance checks](VALIDATION.md): implementation sequence, playtests, and browser performance gates.
- [Usability review](USABILITY.md): kid walkthrough findings, fixes, the HCI and learning theory behind them, and a child-testing protocol.

## What GDD v2 changes in the prototype

Rules live in `src/game/rules.ts` (pure, unit-tested); in-game text in `src/game/content.ts`; world layout and the per-stage list of usable objects in `src/game/world.ts`.

| GDD v2 rule | Where it shows up |
| --- | --- |
| Shield = mass, not fans. 3×3 storage ring around the shelter; each covered cell +1, water tank +2 | S3 wall building, Shield meter, Particle goggles |
| Earth's reply arrives one shift later; contact windows (Mission 1: S2, S5) | Radio + antenna dial, envelope in the HUD, water tank unlocks in S3 |
| Every item is used **or** walled, never both; wall items lock during S4 | Battery/food/kit availability, debrief lesson |
| Power: 3/shift = 2 air + 1 free; spare joint makes shelter air cost 1 | Power meter, S1 spare joint |
| Workshop keep vs take apart; research needs workshop + S4 lamp + S5 radio | S2 doors, S4 lamp, S5 send |
| Food 5, need 6; pack +2, garden +2 after two cares in different shifts | Food meter, harvest gesture |
| Two endings, no game over; dose bars, one lesson, branch map, badges | Pickup card, debrief |
| Mission card; New mission (random card) unlocks after Safe and Sound | Opening brief, title menu |

### How a shift plays (Interaksi §5)

Camera intro → crew line (read aloud in Cadet) → one guess (never graded) that starts with a **What you know** card (one short sentence over a diagram drawn from the game's own pieces, `src/ui/KnowArt.tsx`; spoken in Cadet) and explains each option on hover, focus, or first tap → free play → live meter preview → **Run shift** → one cause-and-effect card with **Why?**.

Hands-on actions, not just menu choices: walking and carrying crates/tank to cells, packing the backpack at the lander, turning the pipe joint (drag/arrow dial), pointing the antenna at Earth, holding to open the food pack, tapping pots to harvest, pressing **Move crew** and watching the crew walk to the shelter, and the **Particle goggles** that draw particle lines stopping at crates and passing through gaps. Hint ladder levels 0–2 run on idle timers (Cadet 15/30 s, Specialist 25/45 s); **Ask crew** steps up a level at once. Cadet mode can skip a gesture with **Do it for me**.

### Cutscenes, visual text and guidance

- In-engine cutscenes (`src/game/cutscenes.ts`): **opening** (cargo lander drops in with a retro flame, thud + dust, crew and B.E.E.P., the Sun), **flare** (S3: flash, Sun bursts, warm sky; the second shot depends on whether Earth's warning arrived), **storm** (S4: orbit over the shelter), and **rescue** (rescue lander descends, B.E.E.P. dances if everyone is safe, "Earth: data received!"). They use letterbox bars with a short caption and a picture strip per shot (`src/ui/Pics.tsx`); Cadet hears the full sentence. **Skip scene**/Escape skips. The opening plays once per page load. The opening and the S1 pipe name things on the world itself (crew, cargo lander, Sun and its particle beams, fan, bent joint, habitat); later shifts drop these tags.
- Text is never plain: `src/ui/Rich.tsx` renders `**bold**` and `{c:…}` markup and auto-colours keywords (food green, power amber, shield teal, Earth blue, storm coral, research pink) and numbers. Speakers get coloured portraits. Result cards show icon-coded effects and before→after chips (Meals 4→3, Shield 0→4, Crew outside→shelter).
- Visual guidance (`nextGoal` in `src/game/world.ts`): a live route of flowing dots from B.E.E.P. to the nearest useful object, a bobbing arrow over it, and a glowing arrow on the HUD button to press next (E action, Move crew, Run shift). It is always on for Cadet and appears after the first hint for Specialist. It's a nudge: other choices still work.

### Not built yet

Ghost-run preview ("Coba Dulu"), hint level 3 (ghost B.E.E.P.), Class mode, live "Today's Sun" panel, archive logs/stickers, autosave between shifts, and real dose numbers (bars are a relative comparison until CRaTER/OSDR numbers are chosen, as the GDD notes). The water tank is a procedural placeholder model.

## Visual direction and game feel

Use **Outlanders** as the primary reference for the miniature settlement, quiet observation, chunky silhouettes, clear actions, and small visible consequences. The [official game page](https://www.pomelogames.com/outlanders/) and the local [reference images](../references/) inform this direction. The camera treatment below is an adaptation for MOONSHIFT, not a claim about the reference game's engine or exact projection.

Compose one shared sand-colored island: cargo lander and item shelf at the front, the 3×3 shelter ring on the right, habitat, garden, workshop, and radio around the rest. Avoid showcase pedestals. B.E.E.P. is player-driven; the crew walk on their own (to the pipe in S1, the workshop doors in S2, the shelter in S4, the rescue lander at pickup).

Preserve [the project's art direction](../design_theme/01_art_direction.md): flat-shaded bevels, texture-free materials, cream `#F7E6C8`, terracotta `#E2683A`, sand `#E6CFB2`, sky `#7FC1F2`, and navy `#2C3A4E` for depth and readable text. Teal means active, amber requests attention, coral marks an alarm, and pink accents science. Labels, shapes, and patterns always accompany color.

Follow [the UI and menu specification](UI_DESIGN.md), which supersedes the earlier system-font-only proposal. Begin with locally hosted Lilita One for display emphasis and Nunito Sans for readable controls, with system fallbacks. Both are explicitly provisional substitutes: the original Outlanders UI font has not been verified. Keep decorative UI quiet so the outpost is the main visual. The HUD carries only the three meters (Power, Food, Shield), the contact window, the crew bubble, the archive data panel, and the bottom bar (Ask crew, Scan, Particle goggles, the action button, Run shift); technical diagnostics belong behind `?diagnostics`.

### Camera and controls

- Perspective third-person camera that follows behind and above B.E.E.P. Turn the view when a building is in the way: the ⟲ ⟳ buttons in the bottom bar, **Q**/**Z** (45° steps), or right-drag. WASD turns with the view, so W always walks "into" the screen.
- Decision clues: standing at (or just after using) a choice shows a card with both sides of the trade-off (e.g. *Use it: +2 meals* or *Save it: +1 shield cell*) and one "think" question built from the mission's numbers. The cargo bay shows what the outpost needs (storm shield, meals, free power). Clues never say which option is right.
- Switches to a top view near the shelter in S3 (and with the goggles on) so cells are easy to aim at, and to a close view during hand gestures.
- Tap the ground to walk, tap an amber ring to walk there and use it, or use WASD/arrows and E. Space/Scan shows labels, G toggles goggles, R turns the tank, Escape pauses.
- Every drag has a tap/keyboard alternative (dial buttons and arrow keys, the shelter-map grid, Walk to…). Reduced motion snaps the camera and removes particle snow.

## Development boundary

Implementation was approved after the planning and UI research phases. The application and its tooling stay within `prototype/`; source art is reused without modifying the original exports. Recorded voice and deployment remain outside this prototype (crew lines use the browser's text-to-speech). Sound effects and music are synthesized in `src/audio.ts` with Web Audio, so there are no audio files: generative calm music, a slower minor-key mood for the flare and storm, a warm theme at rescue, and short effects for taps, pickups, thuds, packing, the radio and the flare. Settings has separate Sound effects and Music switches. Work is recorded in focused commits with rule, build, and browser checks.
