// Short in-engine cutscenes (Interaksi §5 "Kamera" + §9 adegan). Each shot is a
// camera dolly from → to with one caption. Captions use Rich markup.
import { ending, type State } from "./rules";
import { FACILITY, SHELTER } from "./world";

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
export const RESCUE_AT: [number, number] = [1.0, 1.2];
const L = FACILITY.lander;

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
          from: { pos: [-1.2, 2.8, 4.8], look: [-1.9, 1, 0.9] },
          to: { pos: [0.9, 1.9, 5.4], look: [0.8, 0.7, 2.8] },
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
              from: { pos: [-0.2, 2.6, 5], look: [-1.2, 0.8, 1.2] },
              to: { pos: [0.4, 2.2, 4.4], look: [-1.0, 0.7, 1.3] },
              caption: "Earth warned us yesterday, so the {s:water tank} can help. **Good call!**",
            }
          : {
              ms: 2800,
              from: { pos: [-0.5, 2.6, 5.2], look: [-1.9, 1, 0.9] },
              to: { pos: [0.2, 2.2, 4.6], look: [-1.9, 1, 0.9] },
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
          from: { pos: [-0.8, 2.4, 4.6], look: [-1.9, 1, 0.9] },
          to: { pos: [-0.4, 2.1, 4.2], look: [-1.9, 1, 0.9] },
          caption: `Quick, **move the crew** to the {s:shelter}! It has a shield of **${state.shield}**.`,
        },
      ];
    case "rescue":
      return [
        {
          ms: 3400,
          from: { pos: [6, 2.4, 9], look: [RESCUE_AT[0], 7, RESCUE_AT[1]] },
          to: { pos: [6, 2.8, 9], look: [RESCUE_AT[0], 1, RESCUE_AT[1]] },
          caption: "A **rescue lander** drops down from lunar orbit.",
        },
        {
          ms: 3000,
          from: { pos: [3.2, 2.6, 7.2], look: [0.6, 0.8, 2.4] },
          to: { pos: [2.6, 2.2, 6.4], look: [0.6, 0.8, 2.4] },
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
