import { describe, expect, it } from "vitest";
import {
  branchPath,
  doseBars,
  earnedBadges,
  ending,
  evaluate,
  initialSession,
  lesson,
  placeOnWall,
  randomMission,
  sessionReducer,
  wallables,
  wallPlacementError,
  type Plan,
  type Session,
} from "../src/game/rules";

function step(session: Session, edit: (plan: Plan) => Plan, acceptRisk = false) {
  let next = sessionReducer(session, { type: "begin" });
  next = sessionReducer(next, { type: "plan", plan: edit(next.plan) });
  const before = next;
  next = sessionReducer(next, { type: "commit", acceptRisk });
  expect(next, evaluate(before.state, before.plan).errors.join(" ")).not.toBe(before);
  next = sessionReducer(next, { type: "result" });
  return sessionReducer(next, { type: "continue" });
}

// GDD v2 §10: Kit + Research + Battery, Mission 1.
function exampleSession() {
  let s = initialSession();
  s = step(s, (p) => ({ ...p, cargo: ["kit", "research", "battery"] }));
  expect(s.state.stage).toBe(1);
  s = step(s, (p) => ({ ...p, pipeFixed: true }));
  s = step(s, (p) => ({ ...p, workshop: "keep", power: ["radio"] }));
  expect(s.state.forecast).toBe("arrived");
  expect(s.state.food).toBe(3);
  let plan: Plan = { ...s.plan, power: ["garden"] };
  plan = placeOnWall(s.state, plan, "supply1", 0);
  plan = placeOnWall(s.state, plan, "supply2", 2);
  plan = placeOnWall(s.state, plan, "tank", 3, true);
  s = step(s, () => plan);
  expect(s.state.shield).toBe(4);
  expect(s.state.food).toBe(2);
  s = step(s, (p) => ({
    ...p,
    moveCrew: true,
    battery: "cargo",
    power: ["lamp", "garden"],
  }));
  expect(s.state.food).toBe(3);
  s = step(s, (p) => ({ ...p, power: ["radio"] })); // S5: 2 left, pickup eats 1
  return s;
}

describe("GDD v2 worked example", () => {
  it("follows the food trace 5→4→3→2→3→2→1 and ends Safe and Sound", () => {
    const s = exampleSession();
    expect(s.state.stage).toBe(6);
    expect(s.state.food).toBe(1);
    expect(s.state.researchSent).toBe(true);
    expect(s.last?.effects).toContain("Earth: data received!");
    expect(ending(s.state)).toBe("safe");
    expect(earnedBadges(s.state, false).sort()).toEqual(["crew", "scientist"]);
    const debrief = sessionReducer(s, { type: "continue" });
    expect(debrief.state.stage).toBe(7);
    expect(lesson(debrief.state).text).toContain("water tank");
    expect(branchPath(debrief.state).every((node) => node.ok)).toBe(true);
  });

  it("without a forecast the tank cannot move, and an early battery leaves the shield weak", () => {
    let s = initialSession();
    s = step(s, (p) => ({ ...p, cargo: ["kit", "research", "battery"] }));
    s = step(s, (p) => ({ ...p, pipeFixed: true, battery: "cargo" }));
    s = step(s, (p) => ({ ...p, workshop: "keep", power: ["garden"] }));
    expect(wallables(s.state, s.plan)).not.toContain("tank");
    expect(wallPlacementError(s.state, s.plan, "tank", 3, true)).toContain("heavy");
    let plan = placeOnWall(s.state, s.plan, "supply1", 0);
    plan = placeOnWall(s.state, plan, "supply2", 2);
    const evalS3 = evaluate(s.state, plan);
    expect(evalS3.errors).toEqual([]);
    expect(evalS3.risks[0]).toContain("enough");
    s = step(s, () => plan, true);
    s = step(s, (p) => ({ ...p, moveCrew: true }), true);
    s = step(s, (p) => ({ ...p, power: ["garden"] }));
    s = sessionReducer(s, { type: "continue" });
    expect(ending(s.state)).toBe("rescue");
    expect(lesson(s.state).text).toContain("spare battery was used before the storm");
    expect(doseBars(s.state).yours).toBeGreaterThan(doseBars(s.state).full);
  });
});

describe("rules", () => {
  it("limits cargo to 4 slots and asks (not blocks) when no food is packed", () => {
    const s = sessionReducer(initialSession(), { type: "begin" });
    expect(
      evaluate(s.state, { ...s.plan, cargo: ["research", "battery", "food", "kit"] }).errors,
    ).toHaveLength(1);
    const risky = evaluate(s.state, { ...s.plan, cargo: ["battery"] });
    expect(risky.errors).toEqual([]);
    expect(risky.risks[0]).toContain("No food");
  });

  it("requires one open vent unless the spare joint is installed", () => {
    let s = initialSession();
    s = step(s, (p) => ({ ...p, cargo: ["spare", "food", "battery"] }));
    const s1 = sessionReducer(s, { type: "begin" });
    let plan = { ...s1.plan, pipeFixed: true };
    s = step(s, () => plan);
    s = step(s, (p) => ({ ...p, workshop: "dismantle" }));
    plan = s.plan;
    for (const [id, cell] of [["supply1", 1], ["supply2", 7]] as const)
      plan = placeOnWall(s.state, plan, id, cell);
    expect(evaluate(s.state, plan).errors[0]).toContain("vent");

    let t = initialSession();
    t = step(t, (p) => ({ ...p, cargo: ["spare", "food", "battery"] }));
    t = step(t, (p) => ({ ...p, pipeFixed: true, installSpare: true }));
    t = step(t, (p) => ({ ...p, workshop: "dismantle" }));
    plan = t.plan;
    const items = ["supply1", "supply2", "food", "battery", "workshopBattery"] as const;
    [0, 1, 2, 6, 7].forEach((cell, i) => (plan = placeOnWall(t.state, plan, items[i], cell)));
    expect(evaluate(t.state, plan).errors).toEqual([]);
    expect(evaluate(t.state, plan).next.shield).toBe(5);
  });

  it("locks wall items during the storm and frees them in S5", () => {
    let s = initialSession();
    s = step(s, (p) => ({ ...p, cargo: ["food", "battery"] }));
    s = step(s, (p) => ({ ...p, pipeFixed: true }));
    s = step(s, (p) => ({ ...p, workshop: "keep" }));
    let plan = placeOnWall(s.state, s.plan, "food", 0);
    plan = placeOnWall(s.state, plan, "battery", 2);
    plan = placeOnWall(s.state, plan, "supply1", 3);
    s = step(s, () => plan);
    const s4 = sessionReducer(s, { type: "begin" });
    expect(evaluate(s4.state, { ...s4.plan, moveCrew: true, openFood: true }).errors).not.toEqual([]);
    expect(evaluate(s4.state, { ...s4.plan, moveCrew: true, battery: "cargo" }).errors).not.toEqual([]);
    s = step(s, (p) => ({ ...p, moveCrew: true }));
    const s5 = sessionReducer(s, { type: "begin" });
    expect(evaluate(s5.state, { ...s5.plan, openFood: true }).errors).toEqual([]);
  });

  it("shelter air needs only one unit with the spare joint", () => {
    let s = initialSession();
    s = step(s, (p) => ({ ...p, cargo: ["spare", "kit"] }));
    s = step(s, (p) => ({ ...p, pipeFixed: true, installSpare: true, power: ["garden"] }));
    s = step(s, (p) => ({ ...p, workshop: "keep" }));
    s = step(s, (p) => placeOnWall(s.state, p, "supply1", 0), true);
    const s4 = sessionReducer(s, { type: "begin" });
    expect(evaluate(s4.state, { ...s4.plan, moveCrew: true }).power.free).toBe(2);
    expect(evaluate(s4.state, { ...s4.plan, moveCrew: false }).power.free).toBe(1);
  });

  it("commit is idempotent and replay keeps the cargo", () => {
    let s = initialSession();
    s = step(s, (p) => ({ ...p, cargo: ["food"] }));
    s = sessionReducer(s, { type: "begin" });
    s = sessionReducer(s, { type: "plan", plan: { ...s.plan, pipeFixed: true } });
    const once = sessionReducer(s, { type: "commit" });
    expect(sessionReducer(once, { type: "commit" })).toBe(once);
    const replay = sessionReducer(once, { type: "replay" });
    expect(replay.state.stage).toBe(1);
    expect(replay.state.cargo).toEqual(["food"]);
    expect(replay.state.food).toBe(5);
  });

  it("random missions stay within the GDD ranges", () => {
    for (let i = 0; i < 50; i++) {
      const m = randomMission();
      expect([1, 2, 3]).toContain(m.supplies);
      expect(m.windows).toContain(5);
      expect([3, 6]).toContain(m.storm.need);
    }
  });
});
