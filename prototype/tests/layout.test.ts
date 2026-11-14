import { expect, it } from "vitest";
import { CARGO_IDS, initialState, makePlan, MISSION_1, type Stage, type State } from "../src/game/rules";
import { BEEP_START, interactables, ISLAND, OBSTACLES, YARD, type Vec2 } from "../src/game/world";

// B.E.E.P. can only use what it can walk to: every object point must lie outside the solid
// circles and inside the walkable plain, in every shift (a point inside an obstacle is unreachable).
const reachable = ([x, z]: Vec2) =>
  OBSTACLES.every((o) => Math.hypot(x - o.at[0], z - o.at[1]) > o.r) &&
  (x / ISLAND.rx) ** 2 + ((z - ISLAND.cz) / ISLAND.rz) ** 2 <= 1;

it("every object B.E.E.P. can use is reachable in every shift", () => {
  for (const stage of [0, 1, 2, 3, 4, 5] as Stage[]) {
    for (const workshop of ["keep", "dismantle"] as const) {
      const state: State = {
        ...initialState(MISSION_1),
        stage,
        cargo: stage === 0 ? [] : CARGO_IDS.filter((id) => id !== "research" || stage === 4 || stage === 5),
        workshop: stage > 2 ? workshop : null,
        gardenCare: stage === 4 ? 1 : 0,
        forecast: stage >= 3 ? "arrived" : "none",
        lampLit: true,
      };
      const plan = { ...makePlan(state), workshop: stage >= 2 ? workshop : null };
      for (const item of interactables(state, plan, null))
        expect(reachable(item.at), `${item.id} at ${item.at} (stage ${stage})`).toBe(true);
    }
  }
});

it("loose items and the start point are reachable", () => {
  for (const [id, at] of Object.entries(YARD)) expect(reachable(at), id).toBe(true);
  expect(reachable(BEEP_START)).toBe(true);
});
