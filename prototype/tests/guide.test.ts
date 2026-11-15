import { expect, it } from "vitest";
import { initialState, makePlan, type Stage } from "../src/game/rules";
import { interactables, nextGoal } from "../src/game/world";

const at = (stage: Stage) => {
  const state = { ...initialState(), stage, cargo: ["kit", "research", "battery"] as const } as unknown as ReturnType<typeof initialState>;
  return { state, plan: makePlan(state) };
};

it("points the route at the next essential object, then at Run shift", () => {
  const s1 = at(1);
  expect(nextGoal(s1.state, s1.plan, null, interactables(s1.state, s1.plan, null), false)).toEqual({ targets: ["pipe"], ui: null, choice: false });
  const fixed = { ...s1.plan, pipeFixed: true };
  expect(nextGoal(s1.state, fixed, null, interactables(s1.state, fixed, null), false).ui).toBe("run");
  expect(nextGoal(s1.state, fixed, null, interactables(s1.state, fixed, null), true).ui).toBe(null);

  const s3 = at(3);
  const cells = nextGoal(s3.state, s3.plan, "supply1", interactables(s3.state, s3.plan, "supply1"), true).targets;
  expect(cells).not.toContain("cell:1"); // vents stay open first
  expect(cells).not.toContain("cell:4"); // crew in the middle
  expect(cells).toContain("cell:0");
  expect(nextGoal(s3.state, s3.plan, null, interactables(s3.state, s3.plan, null), false).targets).toContain("pick:supply1");

  const s4 = at(4);
  expect(nextGoal(s4.state, s4.plan, null, interactables(s4.state, s4.plan, null), false)).toEqual({ targets: ["shelter"], ui: "moveCrew", choice: false });
});

it("decision clues show both sides and the mission's numbers, never an answer", async () => {
  const { clue } = await import("../src/game/content");
  const s0 = at(0);
  const food = clue(s0.state, s0.plan, "cargo:food")!;
  expect(food.a.text).toMatch(/meals/);
  expect(food.b?.label).toBe("Save it");
  expect(food.think).toContain("**6**");
  expect(clue(s0.state, s0.plan, "cargo:research")!.b?.text).toMatch(/Can't be a wall/);
  const s3 = at(3);
  expect(clue(s3.state, s3.plan, "pick:supply1")!.think).toMatch(/Shield now \*\*0\*\*, the storm needs \*\*3\*\*/);
  expect(clue(s3.state, s3.plan, "nothing")).toBeNull();
});

it("choices are pointed at equally, and taken-back actions are marked as undo", () => {
  const s0 = at(0);
  const g = nextGoal(s0.state, { ...s0.plan, cargo: [] }, null, interactables(s0.state, { ...s0.plan, cargo: [] }, null), false);
  expect(g.choice).toBe(true);
  expect(g.targets.length).toBe(5);
  const full = { ...s0.plan, cargo: ["research", "food"] } as typeof s0.plan;
  const kit = interactables(s0.state, full, null).find((t) => t.id === "cargo:kit")!;
  expect(kit.info).toBeUndefined(); // 1 slot left: still fits
  const packed = { ...s0.plan, cargo: ["research", "food", "battery"] } as typeof s0.plan;
  expect(interactables(s0.state, packed, null).find((t) => t.id === "cargo:spare")!.info).toBe(true);
  const s2 = at(2);
  const sent = { ...s2.plan, power: ["radio"] } as typeof s2.plan;
  expect(interactables(s2.state, sent, null).find((t) => t.id === "radio")!.undo).toBe(true);
});

it("the workshop is one place with two decisions", () => {
  const s2 = at(2);
  const ws = interactables(s2.state, s2.plan, null).filter((t) => t.id === "workshop" || t.id.startsWith("door:"));
  expect(ws.map((t) => t.id)).toEqual(["workshop"]);
  expect(ws[0].gesture).toBe("workshop");
  const sent = { ...s2.plan, power: ["radio"] } as typeof s2.plan; // after the radio call, the guide points at the workshop
  expect(nextGoal(s2.state, sent, null, interactables(s2.state, sent, null), false).targets).toEqual(["workshop"]);
});

it("the crew reacts to what really happened in the shift", async () => {
  const { crewReaction } = await import("../src/game/content");
  const s4 = at(4);
  expect(crewReaction(s4.state, { ...s4.state, crewMoved: false })!.text).toMatch(/stayed in the habitat/);
  expect(crewReaction(s4.state, { ...s4.state, crewMoved: true, shield: 7 })!.text).toMatch(/safe/);
});
