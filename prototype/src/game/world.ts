// World layout (x, z on the island) and the objects B.E.E.P. can use this stage.
import {
  batteryAvailable,
  CARGO,
  cellName,
  foodPackAvailable,
  gardenAvailable,
  lampAvailable,
  MAX_SLOTS,
  radioPurpose,
  shieldOf,
  SHELTER_CELL,
  slotsUsed,
  VENTS,
  wallables,
  wallName,
  wallPlacementError,
  windowOpen,
  type CargoId,
  type Plan,
  type State,
  type WallId,
} from "./rules";

export type Vec2 = [number, number];
export const SHELTER: Vec2 = [3.1, 0.6];
export const CELL = 1.05;
export const cellPos = (cell: number): Vec2 => [
  SHELTER[0] + ((cell % 3) - 1) * CELL,
  SHELTER[1] + (Math.floor(cell / 3) - 1) * CELL,
];
export const FACILITY = {
  habitat: [-2.7, -0.65] as Vec2,
  garden: [-4.3, 2.05] as Vec2,
  workshop: [-3.5, -3.5] as Vec2,
  radio: [0.6, -3.7] as Vec2,
  mainAir: [0.2, -1.2] as Vec2,
  lander: [5.0, 3.9] as Vec2,
};
export const PIPE: Vec2 = [-0.75, -1.2];
/** Where loose items stand: the shelf in front of the cargo lander. */
export const YARD: Record<WallId | "research", Vec2> = {
  supply1: [-2.0, 4.1],
  supply2: [-1.2, 4.1],
  supply3: [-0.4, 4.1],
  food: [0.4, 4.1],
  battery: [1.2, 4.1],
  kit: [2.0, 4.1],
  spare: [2.8, 4.1],
  research: [3.7, 4.6],
  workshopBattery: [-2.3, -2.6],
  tank: [-0.9, 1.4],
};
export const BEEP_START: Vec2 = [0.8, 2.8];
/** Solid circles B.E.E.P. walks around. */
export const OBSTACLES: { at: Vec2; r: number }[] = [
  { at: FACILITY.habitat, r: 1.35 },
  { at: FACILITY.garden, r: 0.95 },
  { at: FACILITY.workshop, r: 1.15 },
  { at: FACILITY.radio, r: 0.9 },
  { at: FACILITY.mainAir, r: 0.55 },
  { at: FACILITY.lander, r: 1.3 },
  { at: SHELTER, r: 0.4 },
];
export const ISLAND = { rx: 7.0, rz: 6.2, cz: 0.25 };

export type Gesture = "pipe" | "antenna" | "harvest" | "foodpack";
export interface Interactable {
  id: string;
  label: string;
  at: Vec2;
  /** Opens a hand gesture instead of acting at once. */
  gesture?: Gesture;
  /** Explains, but cannot be used now (no amber ring). */
  info?: boolean;
  /** Takes back a choice already made: shown quietly so a second press isn't an accident. */
  undo?: boolean;
}

/** Where each wall-able item currently sits in the plan (cell) or in the yard. */
export function itemCell(plan: Plan, id: WallId) {
  const cells = plan.wall.flatMap((value, cell) => (value === id ? [cell] : []));
  return cells.length ? cells : null;
}

export function interactables(
  state: State,
  plan: Plan,
  carrying: WallId | null,
): Interactable[] {
  const list: Interactable[] = [];
  const s = state.stage;
  if (s === 0) {
    const room = MAX_SLOTS - slotsUsed(plan.cargo);
    for (const id of Object.keys(CARGO) as CargoId[])
      if (!plan.cargo.includes(id))
        list.push(
          CARGO[id].slots > room
            ? { id: `cargo:${id}`, label: `No room for the ${CARGO[id].name.toLowerCase()} · put something back`, at: YARD[id], info: true }
            : { id: `cargo:${id}`, label: `Pack ${CARGO[id].name} · ${CARGO[id].slots} slot${CARGO[id].slots > 1 ? "s" : ""}`, at: YARD[id] },
        );
    return list;
  }
  if (s > 5) return list;

  if (s === 3) {
    if (carrying) {
      for (let cell = 0; cell < 9; cell++)
        if (cell !== SHELTER_CELL && !plan.wall[cell])
          list.push({ id: `cell:${cell}`, label: `Place at ${cellName(cell)}`, at: cellPos(cell) });
      list.push({ id: "putback", label: `Put the ${wallName(carrying).toLowerCase()} back`, at: YARD[carrying] });
      return list;
    }
    for (const id of wallables(state, plan)) {
      const cells = itemCell(plan, id);
      const at = cells
        ? (cells.map(cellPos).reduce((a, b) => [a[0] + b[0], a[1] + b[1]]).map((v) => v / cells.length) as Vec2)
        : YARD[id];
      list.push({ id: `pick:${id}`, label: `Pick up the ${wallName(id).toLowerCase()}`, at });
    }
    if (state.forecast !== "arrived")
      list.push({ id: "tank", label: "Water tank: too heavy to move in time", at: YARD.tank, info: true });
  }

  if (s === 1) {
    if (!plan.pipeFixed) list.push({ id: "pipe", label: "Turn the pipe", at: PIPE, gesture: "pipe" });
    else if (state.cargo.includes("spare"))
      list.push({
        id: "spare",
        label: plan.installSpare ? "Take the spare joint off" : "Click in the spare joint",
        at: PIPE,
      });
  }
  if (s === 2) {
    list.push({
      id: "door:keep",
      label: plan.workshop === "keep" ? "Workshop: keep ✓" : "Keep the workshop",
      at: [FACILITY.workshop[0] - 0.8, FACILITY.workshop[1] + 1.4],
    });
    list.push({
      id: "door:dismantle",
      label: plan.workshop === "dismantle" ? "Workshop: taken apart ✓" : "Take the workshop apart",
      at: [FACILITY.workshop[0] + 0.9, FACILITY.workshop[1] + 1.4],
    });
  }
  if (s === 4) {
    list.push({
      id: "shelter",
      label: plan.moveCrew ? "Call the crew back" : "Move crew to the shelter",
      at: [SHELTER[0], SHELTER[1] + 1.9],
    });
    if (lampAvailable(state, plan))
      list.push({
        id: "lamp",
        label: plan.power.includes("lamp") ? "Sample lamp: off" : "Sample lamp on · 1 power",
        at: [FACILITY.workshop[0], FACILITY.workshop[1] + 1.4],
      });
  }
  if (gardenAvailable(state))
    list.push({
      id: "garden",
      label: plan.power.includes("garden")
        ? "Garden: power off"
        : state.gardenCare === 1
          ? "Harvest the garden · 1 power"
          : "Care for the garden · 1 power",
      at: [FACILITY.garden[0] + 1.1, FACILITY.garden[1] + 0.3],
      gesture: !plan.power.includes("garden") && state.gardenCare === 1 ? "harvest" : undefined,
    });
  const purpose = radioPurpose(state);
  list.push({
    id: "radio",
    label: plan.power.includes("radio")
      ? "Radio: cancel message"
      : !windowOpen(state)
        ? "Radio: Earth can't hear us now"
        : purpose === "forecast"
          ? "Ask Earth about the Sun · 1 power"
          : purpose === "research"
            ? "Send research to Earth · 1 power"
            : "Radio: nothing to send",
    at: [FACILITY.radio[0], FACILITY.radio[1] + 1.2],
    gesture: !plan.power.includes("radio") && purpose ? "antenna" : undefined,
    info: !plan.power.includes("radio") && !purpose,
  });
  if (s !== 3) {
    if (batteryAvailable(state, plan, "cargo"))
      list.push({
        id: "battery",
        label: plan.battery === "cargo" ? "Unplug the battery" : "Plug in the battery · +1 power",
        at: YARD.battery,
      });
    if (batteryAvailable(state, plan, "workshop"))
      list.push({
        id: "workshopBattery",
        label: plan.battery === "workshop" ? "Unplug the workshop battery" : "Plug in the workshop battery · +1 power",
        at: YARD.workshopBattery,
      });
    if (foodPackAvailable(state))
      list.push({
        id: "foodpack",
        label: plan.openFood ? "Close the food pack" : "Open the food pack · +2 meals",
        at: YARD.food,
        gesture: plan.openFood ? undefined : "foodpack",
      });
  }
  const chosen = [
    plan.installSpare && "spare",
    plan.workshop && `door:${plan.workshop}`,
    plan.moveCrew && "shelter",
    plan.openFood && "foodpack",
    plan.battery === "cargo" && "battery",
    plan.battery === "workshop" && "workshopBattery",
    ...plan.power,
  ];
  return list.map((item) => (chosen.includes(item.id) ? { ...item, undo: true } : item));
}

export type UiGoal = "run" | "moveCrew" | null;
/**
 * What a child should do next (Interaksi §7 world signs): the objects the live route points at,
 * or the HUD button to press. A nudge, never a rule: other choices still work.
 */
export function nextGoal(state: State, plan: Plan, carrying: WallId | null, things: Interactable[], blocked: boolean, vertical = false) {
  const usable = (pred: (id: string) => boolean) => things.filter((t) => !t.info && pred(t.id)).map((t) => t.id);
  const go = (targets: string[], choice = false) => ({ targets, ui: null as UiGoal, choice });
  const done = { targets: [] as string[], ui: (blocked ? null : "run") as UiGoal, choice: false };
  switch (state.stage) {
    case 0: {
      const room = MAX_SLOTS - slotsUsed(plan.cargo);
      const fits = usable((id) => id.startsWith("cargo:") && CARGO[id.slice(6) as CargoId].slots <= room);
      return fits.length ? go(fits, true) : done;
    }
    case 1:
      return plan.pipeFixed ? done : go(["pipe"]);
    case 2:
      if (radioPurpose(state) === "forecast" && !plan.power.includes("radio")) return go(["radio"]);
      return plan.workshop ? done : go(["door:keep", "door:dismantle"], true);
    case 3: {
      if (carrying) {
        // Only squares the carried item really fits (the tank needs two).
        const cells = usable((id) => id.startsWith("cell:") && !wallPlacementError(state, plan, carrying, Number(id.slice(5)), vertical));
        const solid = cells.filter((id) => !VENTS.includes(Number(id.slice(5))));
        return go(solid.length ? solid : cells);
      }
      if (shieldOf(plan.wall) >= state.mission.storm.need) return done;
      const loose = usable((id) => id.startsWith("pick:") && !itemCell(plan, id.slice(5) as WallId));
      return loose.length ? go(loose) : done;
    }
    case 4:
      return plan.moveCrew ? done : { targets: ["shelter"], ui: "moveCrew" as UiGoal, choice: false };
    case 5: {
      if (radioPurpose(state) === "research" && !plan.power.includes("radio")) return go(["radio"]);
      // Two meals left to eat (tonight + pickup).
      const food = state.food + (plan.openFood ? 2 : 0) + (plan.power.includes("garden") && state.gardenCare === 1 ? 2 : 0);
      const fill = food < 2 ? usable((id) => id === "foodpack" || id === "garden") : [];
      return fill.length ? go(fill) : done;
    }
    default:
      return go([]);
  }
}
