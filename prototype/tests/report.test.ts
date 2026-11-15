import { describe, expect, it } from "vitest";
import { choiceChain, outcome, MEALS_NEEDED } from "../src/game/report";
import { ending, initialState, type CargoId, type State } from "../src/game/rules";
import { runPath, TREE, TREE_NODES } from "../src/game/tree";

/** Every combination of the facts the endings depend on. */
function* finals(): Generator<State> {
  const cargos: CargoId[][] = [[], ["food"], ["kit"], ["food", "kit"], ["research", "battery"], ["food", "research"]];
  for (const cargo of cargos)
    for (const forecast of ["none", "arrived"] as const)
      for (const shield of [1, 3, 6])
        for (const crewMoved of [false, true])
          for (const missed of [0, 1])
            for (const tank of [false, true]) {
              const s = initialState();
              s.stage = 7;
              Object.assign(s, { cargo, forecast, shield, crewMoved, missed, workshop: "keep", researchSent: cargo.includes("research") && shield === 6 });
              if (tank) s.wall[0] = s.wall[3] = "tank";
              yield s;
            }
}

describe("decision tree", () => {
  it("has unique node ids and links only to real nodes", () => {
    const ids = TREE_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of TREE_NODES) for (const l of n.leads ?? []) expect(ids).toContain(l);
  });
  it("lights exactly one node in every row for any run", () => {
    for (const s of finals())
      for (const row of TREE) expect(row.nodes.filter((n) => n.test(s)).map((n) => n.id), row.id).toHaveLength(1);
  });
  it("ends on the node that matches the game's ending", () => {
    for (const s of finals()) expect(runPath(s).at(-1)).toBe(ending(s) === "safe" ? "end.safe" : "end.rescue");
  });
});

describe("mission report", () => {
  it("blames a step exactly when the ending was not Safe and Sound", () => {
    for (const s of finals()) {
      const chain = choiceChain(s);
      const blamed = chain.filter((step) => step.decisive);
      if (ending(s) === "safe") expect(blamed).toHaveLength(0);
      else expect(blamed.length).toBeGreaterThan(0);
      for (const step of blamed) expect(step.good).toBe(false);
      for (const step of chain) if (!step.good) expect(step.instead).toBeTruthy();
    }
  });
  it("only calls it safe when the game does", () => {
    for (const s of finals()) expect(outcome(s) === "safe").toBe(ending(s) === "safe");
  });
  it("counts meals out of six", () => {
    const s = initialState();
    s.missed = 1;
    expect(choiceChain(s).find((x) => x.key === "meals")!.chose).toBe(`The crew ate ${MEALS_NEEDED - 1} of ${MEALS_NEEDED} meals.`);
  });
});
