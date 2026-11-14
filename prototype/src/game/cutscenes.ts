// Short in-engine cutscenes (Interaksi §5 "Kamera" + §9 adegan). Each shot is a
// camera dolly from → to with one caption. Captions use Rich markup.
import { ending, type State } from "./rules";
import { BEEP_START, CREW_HOME, FACILITY, PICKUP_SPOTS, RESCUE_PAD, SHELTER, YARD } from "./world";

export type P3 = [number, number, number];
export type CutsceneId = "opening" | "flare" | "storm" | "rescue";
/** Small drawings shown over a shot when the idea is abstract (orbits, what a shift is). */
export type CineArt = "orbit" | "track" | "shift-plan" | "shift-jump" | "shift-meal";
export interface Shot {
  /** Names the shot so the 3D scene can react to it (lander drop, crew wave…), independent of its index. */
  key?: string;
  art?: CineArt;
  ms: number;
  from: { pos: P3; look: P3 };
  to: { pos: P3; look: P3 };
  caption: string;
  shake?: boolean;
  flash?: boolean;
}
export interface Cine {
  id: CutsceneId;
  shots: Shot[];
  shot: number;
  start: number;
}

/** The prologue, before the cargo lander arrives: the place, B.E.E.P., the crew, the goal and what a shift is. */
export const PROLOGUE = ["base", "beep", "crew", "orbit", "pad", "plan", "jump", "meal"];
export const shotKey = (cine: Cine | null) => (cine ? (cine.shots[cine.shot]?.key ?? null) : null);
/** True while the opening has not reached the cargo lander's touchdown yet. */
export const beforeLanding = (cine: Cine | null) => cine?.id === "opening" && (PROLOGUE.includes(shotKey(cine)!) || shotKey(cine) === "land");
/** How many shifts until the rescue lander can come down (its orbit lines up after shift 5). */
export const RESCUE_SHIFT = 5;

/** The Sun sits low over the horizon, behind the radio mast. */
export const SUN: P3 = [-24, 13, -32];
/** Earth sits low on the horizon at the lunar south pole, near the Sun in this view. */
export const EARTH: P3 = [-14, 6, -38];
export const RESCUE_AT: [number, number] = RESCUE_PAD;
const L = FACILITY.lander;
/** Middle of the crew group outside the habitat, and of the pickup group by the pad. */
const C = CREW_HOME[1];
const P = PICKUP_SPOTS[1];
const B = BEEP_START;

export function cutscene(id: CutsceneId, state: State): Shot[] {
  switch (id) {
    case "opening":
      // Written for a 7–12 year old who knows nothing yet: where we are, who you are, who you protect,
      // when help comes and why not sooner, what one shift is, and only then the trouble.
      return [
        {
          key: "base",
          ms: 5200,
          from: { pos: [4, 26, 30], look: [-6, 9, -30] },
          to: { pos: [9, 6.5, 13.5], look: [-1, 1, 0] },
          caption: "The Moon's **south pole**. A tiny outpost, very far from home.",
        },
        {
          key: "beep",
          ms: 4400,
          from: { pos: [B[0] + 2.6, 2.4, B[1] + 3.4], look: [B[0], 0.6, B[1]] },
          to: { pos: [B[0] + 1.1, 1.3, B[1] + 2.0], look: [B[0], 0.6, B[1]] },
          caption: "This little robot is **you**: B.E.E.P., the outpost's helper.",
        },
        {
          key: "crew",
          ms: 4400,
          from: { pos: [C[0] + 1.0, 2.8, C[1] + 4.6], look: [C[0], 1, C[1]] },
          to: { pos: [C[0] + 0.6, 2.1, C[1] + 3.3], look: [C[0], 1, C[1]] },
          caption: "Three astronauts live here. **Your job: keep them safe.**",
        },
        {
          key: "orbit",
          art: "orbit",
          ms: 6000,
          from: { pos: [C[0] + 2, 1.6, C[1] + 4.5], look: [C[0], 3, C[1]] },
          to: { pos: [2, 1.4, 8], look: [8, 14, -30] },
          caption: "Their ride home circles the Moon in a big, slow **orbit**. One lap takes about a week.",
        },
        {
          key: "pad",
          art: "track",
          ms: 6400,
          from: { pos: [RESCUE_PAD[0] - 5, 3.4, RESCUE_PAD[1] + 6.5], look: [RESCUE_PAD[0], 1.8, RESCUE_PAD[1]] },
          to: { pos: [RESCUE_PAD[0] - 3.4, 2.4, RESCUE_PAD[1] + 4.8], look: [RESCUE_PAD[0], 1.4, RESCUE_PAD[1]] },
          caption: `So it can only land **after shift ${RESCUE_SHIFT}**. Until then, the crew counts on you.`,
        },
        {
          key: "plan",
          art: "shift-plan",
          ms: 4800,
          from: { pos: [4, 9, 12], look: [-1, 0.6, 0] },
          to: { pos: [3, 8, 10.5], look: [-1, 0.6, 0] },
          caption: "Each **shift** has jobs: fix things, carry cargo, build, share power.",
        },
        {
          key: "jump",
          art: "shift-jump",
          ms: 4000,
          from: { pos: [3, 8, 10.5], look: [-1, 0.6, 0] },
          to: { pos: [2.4, 9.5, 11.5], look: [-1, 0.6, 0] },
          caption: "When the jobs are ready, press **Run shift**. Time jumps ahead.",
        },
        {
          key: "meal",
          art: "shift-meal",
          ms: 4800,
          from: { pos: [C[0] + 1.2, 2.6, C[1] + 5.2], look: [C[0], 1.35, C[1]] },
          to: { pos: [C[0] + 0.8, 2.4, C[1] + 4.6], look: [C[0], 1.4, C[1]] },
          caption: "And every shift, the crew eats **1 meal**. Food is limited!",
        },
        {
          key: "land",
          ms: 3600,
          from: { pos: [L[0] + 2, 26, L[1] + 22], look: [L[0], 8, L[1]] },
          to: { pos: [L[0] + 6, 6, L[1] + 9], look: [L[0], 1.6, L[1]] },
          caption: "Today a **cargo lander** brings supplies. It's coming in too fast!",
        },
        {
          key: "thud",
          ms: 2800,
          shake: true,
          from: { pos: [L[0] + 4.5, 3.6, L[1] + 6], look: [L[0], 0.9, L[1]] },
          to: { pos: [L[0] + 4, 3.2, L[1] + 5.4], look: [L[0], 0.8, L[1]] },
          caption: "**Thud!** It crashed. Cargo is scattered on the ground.",
        },
        {
          key: "sun",
          ms: 3800,
          from: { pos: [1.5, 1.8, 6.5], look: [0, 3, 0] },
          to: { pos: [1.5, 2.2, 6.5], look: SUN },
          caption: "And the {d:Sun} is waking up. A storm of {d:particles} is coming.",
        },
        {
          key: "go",
          ms: 3400,
          from: { pos: [B[0] + 1.6, 2.4, B[1] + 3.8], look: [B[0], 0.8, B[1] - 1] },
          to: { pos: [B[0] + 0.6, 3.4, B[1] + 4.8], look: [B[0], 0.6, B[1] - 1.5] },
          caption: "First job: save the cargo that matters most. **Let's go, B.E.E.P.!**",
        },
      ];
    case "flare":
      return [
        {
          ms: 2800,
          flash: true,
          from: { pos: [1.5, 2.2, 6.5], look: SUN },
          to: { pos: [1.2, 2.4, 5.5], look: SUN },
          caption: "**Flash!** A big {d:solar flare} just went off.",
        },
        state.forecast === "arrived"
          ? {
              ms: 2800,
              from: { pos: [YARD.tank[0] + 0.7, 2.6, YARD.tank[1] + 3.6], look: [YARD.tank[0], 0.8, YARD.tank[1]] },
              to: { pos: [YARD.tank[0] + 1.3, 2.2, YARD.tank[1] + 3.0], look: [YARD.tank[0], 0.7, YARD.tank[1]] },
              caption: "Earth warned us yesterday, so the {s:water tank} can help. **Good call!**",
            }
          : {
              ms: 2800,
              from: { pos: [C[0] + 1.4, 2.6, C[1] + 4.3], look: [C[0], 1, C[1]] },
              to: { pos: [C[0] + 2.1, 2.2, C[1] + 3.7], look: [C[0], 1, C[1]] },
              caption: "No warning from Earth! {d:Particles} arrive in **about 1 hour**.",
            },
      ];
    case "storm":
      return [
        {
          ms: 3200,
          from: { pos: [SHELTER[0] + 7, 9, SHELTER[1] + 7], look: [SHELTER[0], 0.5, SHELTER[1]] },
          to: { pos: [SHELTER[0] - 2, 7, SHELTER[1] + 8], look: [SHELTER[0], 0.5, SHELTER[1]] },
          caption: "The {d:particle storm} is here. They fall softly, but they add up.",
        },
        {
          ms: 2400,
          from: { pos: [C[0] + 1.1, 2.4, C[1] + 3.7], look: [C[0], 1, C[1]] },
          to: { pos: [C[0] + 1.5, 2.1, C[1] + 3.3], look: [C[0], 1, C[1]] },
          caption: `Quick, **move the crew** to the {s:shelter}! It has a shield of **${state.shield}**.`,
        },
      ];
    case "rescue":
      return [
        {
          key: "land",
          ms: 3400,
          from: { pos: [RESCUE_AT[0] - 5, 2.4, RESCUE_AT[1] + 7.8], look: [RESCUE_AT[0], 7, RESCUE_AT[1]] },
          to: { pos: [RESCUE_AT[0] - 5, 2.8, RESCUE_AT[1] + 7.8], look: [RESCUE_AT[0], 1, RESCUE_AT[1]] },
          caption: "A **rescue lander** drops down from lunar orbit.",
        },
        {
          key: "thud",
          ms: 3000,
          from: { pos: [P[0] + 2.6, 2.6, P[1] + 4.8], look: [P[0], 0.8, P[1]] },
          to: { pos: [P[0] + 2.0, 2.2, P[1] + 4.0], look: [P[0], 0.8, P[1]] },
          caption:
            ending(state) === "safe"
              ? "Everyone is {s:safe} and {f:fed}. **Time to go home!**"
              : "Help is here. **Everyone goes home**, and B.E.E.P. has ideas for next time.",
        },
        ...(state.researchSent
          ? [
              {
                ms: 2400,
                from: { pos: [FACILITY.radio[0] + 1.5, 2, FACILITY.radio[1] + 5], look: [FACILITY.radio[0], 2.5, FACILITY.radio[1]] },
                to: { pos: [FACILITY.radio[0] + 1.5, 2.2, FACILITY.radio[1] + 4.5], look: [FACILITY.radio[0], 3.2, FACILITY.radio[1]] },
                caption: "{e:Earth}: **data received!** Your {r:plant research} made it home.",
              } satisfies Shot,
            ]
          : []),
      ];
  }
}

/** 0..1 progress through the current shot. */
export const shotProgress = (cine: Cine) =>
  Math.min(1, Math.max(0, (performance.now() - cine.start) / cine.shots[cine.shot].ms));
export const ease = (t: number) => t * t * (3 - 2 * t);
