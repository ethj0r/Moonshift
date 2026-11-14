// Short in-engine cutscenes (Interaksi §5 "Kamera" + §9 adegan). Each shot is a
// camera dolly from → to with one caption. Captions use Rich markup.
import { ending, type State } from "./rules";
import { BEEP_START, CREW_HOME, FACILITY, PICKUP_SPOTS, RESCUE_PAD, SHELTER, YARD } from "./world";

export type P3 = [number, number, number];
export type CutsceneId = "opening" | "flare" | "storm" | "rescue";
export interface Shot {
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
      return [
        {
          ms: 3400,
          from: { pos: [L[0] + 2, 26, L[1] + 22], look: [L[0], 8, L[1]] },
          to: { pos: [L[0] + 6, 6, L[1] + 9], look: [L[0], 1.6, L[1]] },
          caption: "A **cargo lander** is coming down.",
        },
        {
          ms: 2400,
          shake: true,
          from: { pos: [L[0] + 4.5, 3.6, L[1] + 6], look: [L[0], 0.9, L[1]] },
          to: { pos: [L[0] + 4, 3.2, L[1] + 5.4], look: [L[0], 0.8, L[1]] },
          caption: "**Thud!** Some cargo broke loose.",
        },
        {
          ms: 3200,
          from: { pos: [C[0] + 0.9, 2.8, C[1] + 3.9], look: [C[0], 1, C[1]] },
          to: { pos: [B[0] + 0.1, 1.9, B[1] + 2.6], look: [B[0], 0.7, B[1]] },
          caption: "Three astronauts wait for rescue. **You** help them.",
        },
        {
          ms: 3400,
          from: { pos: [1.5, 1.8, 6.5], look: [0, 3, 0] },
          to: { pos: [1.5, 2.2, 6.5], look: SUN },
          caption: "The {d:Sun} is waking up. Its {d:particles} are on the way.",
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
          ms: 3400,
          from: { pos: [RESCUE_AT[0] - 5, 2.4, RESCUE_AT[1] + 7.8], look: [RESCUE_AT[0], 7, RESCUE_AT[1]] },
          to: { pos: [RESCUE_AT[0] - 5, 2.8, RESCUE_AT[1] + 7.8], look: [RESCUE_AT[0], 1, RESCUE_AT[1]] },
          caption: "A **rescue lander** drops down from lunar orbit.",
        },
        {
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
