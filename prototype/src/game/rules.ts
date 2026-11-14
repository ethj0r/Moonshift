// MOONSHIFT rules, GDD v2 ("Panduan Cepat versi 2").
// Stage 0 = cargo opener, 1–5 = shifts, 6 = pickup, 7 = debrief.
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const PICKUP = 6;
export const DEBRIEF = 7;
export type CargoId = "battery" | "food" | "kit" | "spare" | "research";
export type WallId =
  | "battery"
  | "food"
  | "kit"
  | "spare"
  | "workshopBattery"
  | "tank"
  | "supply1"
  | "supply2"
  | "supply3";
export type Device = "garden" | "radio" | "lamp";
export type Crew = "commander" | "technician" | "researcher";
export type Wall = (WallId | null)[];
export type Phase = "brief" | "play" | "running" | "result";

export interface Storm {
  key: "sep2017" | "oct2003";
  label: string;
  scale: 3 | 4;
  need: number;
}
export interface Mission {
  id: number;
  storm: Storm;
  supplies: number;
  windows: number[];
}
export const STORMS: Record<Storm["key"], Storm> = {
  sep2017: { key: "sep2017", label: "September 2017", scale: 3, need: 3 },
  oct2003: { key: "oct2003", label: "October 2003", scale: 4, need: 6 },
};
export const MISSION_1: Mission = {
  id: 1,
  storm: STORMS.sep2017,
  supplies: 2,
  windows: [2, 5],
};
export function randomMission(random = Math.random): Mission {
  return {
    id: 2 + Math.floor(random() * 98),
    storm: random() < 0.5 ? STORMS.sep2017 : STORMS.oct2003,
    supplies: 1 + Math.floor(random() * 3),
    windows: random() < 0.5 ? [1, 5] : [2, 5],
  };
}

export const CARGO: Record<
  CargoId,
  { name: string; slots: number; use: string; wall: string }
> = {
  battery: {
    name: "Spare battery",
    slots: 1,
    use: "+1 power for one shift",
    wall: "Wall: 1 cell",
  },
  food: {
    name: "Food pack",
    slots: 1,
    use: "+2 meals, opens once",
    wall: "Wall: 1 cell",
  },
  kit: {
    name: "Garden kit",
    slots: 1,
    use: "Care twice: +2 meals",
    wall: "Wall: 1 cell, before first care",
  },
  spare: {
    name: "Spare pipe joint",
    slots: 1,
    use: "Shelter air needs only 1 power",
    wall: "Wall: 1 cell",
  },
  research: {
    name: "Research crate",
    slots: 2,
    use: "Plant samples for science",
    wall: "Cannot be a wall",
  },
};
export const CARGO_IDS = Object.keys(CARGO) as CargoId[];
export const MAX_SLOTS = 4;
export const START_FOOD = 5;
export const VENTS = [1, 7];
export const SHELTER_CELL = 4;
export const cellName = (cell: number) =>
  `${"ABC"[Math.floor(cell / 3)]}${(cell % 3) + 1}`;
export function wallName(id: WallId) {
  if (id.startsWith("supply")) return "Supply crate";
  if (id === "tank") return "Water tank";
  if (id === "workshopBattery") return "Workshop battery";
  return CARGO[id as CargoId].name;
}

export interface State {
  mission: Mission;
  stage: Stage;
  cargo: CargoId[];
  food: number;
  missed: number;
  pipeFixed: boolean;
  spareInstalled: boolean;
  workshop: "keep" | "dismantle" | null;
  gardenCare: number;
  forecast: "none" | "sent" | "arrived";
  foodOpened: boolean;
  batteryUsed: boolean;
  workshopBatteryUsed: boolean;
  usedBeforeStorm: WallId[];
  wall: Wall;
  shield: number;
  crewMoved: boolean;
  lampLit: boolean;
  researchSent: boolean;
  requests: Record<Crew, boolean>;
}

export interface Plan {
  cargo: CargoId[];
  pipeFixed: boolean;
  installSpare: boolean;
  workshop: "keep" | "dismantle" | null;
  power: Device[];
  battery: "none" | "cargo" | "workshop";
  openFood: boolean;
  wall: Wall;
  moveCrew: boolean;
}

export interface Evaluation {
  next: State;
  errors: string[];
  risks: string[];
  effects: string[];
  power: { used: number; free: number };
}

export function initialState(mission: Mission = MISSION_1): State {
  return {
    mission,
    stage: 0,
    cargo: [],
    food: START_FOOD,
    missed: 0,
    pipeFixed: false,
    spareInstalled: false,
    workshop: null,
    gardenCare: 0,
    forecast: "none",
    foodOpened: false,
    batteryUsed: false,
    workshopBatteryUsed: false,
    usedBeforeStorm: [],
    wall: Array(9).fill(null),
    shield: 0,
    crewMoved: false,
    lampLit: false,
    researchSent: false,
    requests: { commander: false, technician: false, researcher: false },
  };
}

export function makePlan(state: State): Plan {
  return {
    cargo: [...state.cargo],
    pipeFixed: state.pipeFixed,
    installSpare: false,
    workshop: state.workshop,
    power: [],
    battery: "none",
    openFood: false,
    wall: [...state.wall],
    moveCrew: false,
  };
}

export const slotsUsed = (cargo: CargoId[]) =>
  cargo.reduce((sum, id) => sum + CARGO[id].slots, 0);
const has = (state: State, id: CargoId) => state.cargo.includes(id);
// Items in the shelter wall stay locked until the storm (S4) is over.
const lockedInWall = (state: State, id: WallId) =>
  state.stage === 4 && state.wall.includes(id);

export function foodPackAvailable(state: State) {
  return has(state, "food") && !state.foodOpened && !lockedInWall(state, "food");
}
export function batteryAvailable(
  state: State,
  plan: Plan,
  kind: "cargo" | "workshop",
) {
  return kind === "cargo"
    ? has(state, "battery") &&
        !state.batteryUsed &&
        !lockedInWall(state, "battery")
    : plan.workshop === "dismantle" &&
        state.stage >= 2 &&
        !state.workshopBatteryUsed &&
        !lockedInWall(state, "workshopBattery");
}
export function gardenAvailable(state: State) {
  return (
    has(state, "kit") &&
    state.stage >= 1 &&
    state.stage <= 5 &&
    state.gardenCare < 2 &&
    !(state.gardenCare === 0 && lockedInWall(state, "kit"))
  );
}
export const windowOpen = (state: State) =>
  state.mission.windows.includes(state.stage);
export function researchReady(state: State) {
  return (
    has(state, "research") &&
    state.workshop === "keep" &&
    state.lampLit &&
    !state.researchSent
  );
}
export function radioPurpose(state: State): "forecast" | "research" | null {
  if (!windowOpen(state)) return null;
  if (state.stage === 5) return researchReady(state) ? "research" : null;
  return state.forecast === "none" ? "forecast" : null;
}
export function lampAvailable(state: State, plan: Plan) {
  return (
    state.stage === 4 && has(state, "research") && plan.workshop === "keep"
  );
}
export function freePower(state: State, plan: Plan) {
  // 3 units per shift: 2 for air, 1 free. Shelter air needs only 1 with the spare joint.
  return (
    1 +
    Number(plan.battery !== "none") +
    Number(state.stage === 4 && plan.moveCrew && state.spareInstalled)
  );
}

/** Items that can stand in the S3 wall, given this shift's plan. */
export function wallables(state: State, plan: Plan): WallId[] {
  const list: WallId[] = [];
  for (let i = 1; i <= state.mission.supplies; i++)
    list.push(`supply${i}` as WallId);
  if (state.forecast === "arrived") list.push("tank");
  if (has(state, "food") && !state.foodOpened && !plan.openFood)
    list.push("food");
  if (has(state, "battery") && !state.batteryUsed && plan.battery !== "cargo")
    list.push("battery");
  if (
    has(state, "kit") &&
    state.gardenCare === 0 &&
    !plan.power.includes("garden")
  )
    list.push("kit");
  if (has(state, "spare") && !state.spareInstalled) list.push("spare");
  if (
    state.workshop === "dismantle" &&
    !state.workshopBatteryUsed &&
    plan.battery !== "workshop"
  )
    list.push("workshopBattery");
  return list;
}

export const shieldOf = (wall: Wall) =>
  wall.filter((value, cell) => value && cell !== SHELTER_CELL).length;
export const ventsOpen = (wall: Wall) => VENTS.filter((cell) => !wall[cell]);
export const shieldTier = (shield: number) =>
  shield >= 6 ? "Strong" : shield >= 3 ? "Medium" : "Weak";
export function tankCells(anchor: number, vertical: boolean) {
  return [anchor, anchor + (vertical ? 3 : 1)];
}
function tankFits(anchor: number, vertical: boolean) {
  const cells = tankCells(anchor, vertical);
  return (
    anchor >= 0 &&
    cells[1] < 9 &&
    (vertical || anchor % 3 !== 2) &&
    !cells.includes(SHELTER_CELL)
  );
}

export function removeFromWall(wall: Wall, id: WallId): Wall {
  return wall.map((value) => (value === id ? null : value));
}
export function wallPlacementError(
  state: State,
  plan: Plan,
  id: WallId,
  cell: number,
  vertical = false,
): string | null {
  if (state.stage !== 3) return "The wall is built in Shift 3.";
  if (!wallables(state, plan).includes(id))
    return id === "tank"
      ? "The tank is too heavy to move without Earth's warning."
      : `The ${wallName(id).toLowerCase()} is not free to use as a wall.`;
  if (cell === SHELTER_CELL) return "The crew waits in the middle.";
  const cells = id === "tank" ? tankCells(cell, vertical) : [cell];
  if (id === "tank" && !tankFits(cell, vertical))
    return "The tank needs two side-by-side cells around the shelter.";
  const base = removeFromWall(plan.wall, id);
  const taken = cells.find((value) => base[value]);
  return taken === undefined
    ? null
    : `${cellName(taken)} already holds the ${wallName(base[taken]!).toLowerCase()}.`;
}
export function placeOnWall(
  state: State,
  plan: Plan,
  id: WallId,
  cell: number,
  vertical = false,
): Plan {
  if (wallPlacementError(state, plan, id, cell, vertical)) return plan;
  const wall = removeFromWall(plan.wall, id);
  for (const value of id === "tank" ? tankCells(cell, vertical) : [cell])
    wall[value] = id;
  return { ...plan, wall };
}

function eat(next: State, effects: string[]) {
  if (next.food > 0) {
    next.food -= 1;
    effects.push("The crew ate one meal.");
  } else {
    next.missed += 1;
    effects.push("The crew missed a meal.");
  }
}

export function evaluate(state: State, plan: Plan): Evaluation {
  const next: State = structuredClone(state);
  const errors: string[] = [];
  const risks: string[] = [];
  const effects: string[] = [];
  const power = { used: plan.power.length, free: freePower(state, plan) };

  if (state.stage === 0) {
    if (new Set(plan.cargo).size !== plan.cargo.length)
      errors.push("Each item can be packed once.");
    if (slotsUsed(plan.cargo) > MAX_SLOTS)
      errors.push("The backpack holds 4 slots. Put something back.");
    if (!plan.cargo.includes("food") && !plan.cargo.includes("kit"))
      risks.push("No food? We'll be one meal short. Sure?");
    next.cargo = [...plan.cargo];
    effects.push(
      plan.cargo.length
        ? `Packed: ${plan.cargo.map((id) => CARGO[id].name).join(", ")}.`
        : "B.E.E.P. left the cargo bay empty-handed.",
    );
    return { next, errors, risks, effects, power };
  }
  if (state.stage > 5) return { next, errors, risks, effects, power };

  // Power and one-shot items.
  if (new Set(plan.power).size !== plan.power.length)
    errors.push("A device takes power once.");
  if (power.used > power.free)
    errors.push("Not enough power. Turn something off or use a battery.");
  if (plan.battery !== "none") {
    if (!batteryAvailable(state, plan, plan.battery))
      errors.push("That battery cannot be used now.");
    else if (state.stage === 3 && plan.wall.includes(
      plan.battery === "cargo" ? "battery" : "workshopBattery",
    ))
      errors.push("A battery in the wall cannot also give power.");
    else {
      if (plan.battery === "cargo") next.batteryUsed = true;
      else next.workshopBatteryUsed = true;
      if (state.stage < 3)
        next.usedBeforeStorm.push(
          plan.battery === "cargo" ? "battery" : "workshopBattery",
        );
      effects.push("Battery plugged in: +1 power this shift.");
    }
  }
  if (plan.openFood) {
    if (!foodPackAvailable(state))
      errors.push("The food pack cannot be opened now.");
    else if (state.stage === 3 && plan.wall.includes("food"))
      errors.push("The food pack in the wall stays closed until after the storm.");
    else {
      next.foodOpened = true;
      next.food += 2;
      if (state.stage <= 3) next.usedBeforeStorm.push("food");
      effects.push("Food pack opened: +2 meals.");
    }
  }
  if (plan.power.includes("garden")) {
    if (!gardenAvailable(state)) errors.push("The garden cannot be cared for now.");
    else if (state.stage === 3 && state.gardenCare === 0 && plan.wall.includes("kit"))
      errors.push("The garden kit in the wall cannot be installed.");
    else {
      next.gardenCare += 1;
      if (next.gardenCare === 2) {
        next.food += 2;
        effects.push("Garden harvest: +2 meals.");
      } else effects.push("Garden lights on. One more care to harvest.");
    }
  }
  if (plan.power.includes("radio")) {
    const purpose = radioPurpose(state);
    if (!windowOpen(state)) errors.push("Earth cannot hear us this shift.");
    else if (!purpose) errors.push("There is nothing to send yet.");
    else if (purpose === "forecast") {
      next.forecast = "sent";
      effects.push("Message sent to Earth. Reply: next shift.");
    } else {
      next.researchSent = true;
      effects.push("Research data sent to Earth.");
    }
  }
  if (plan.power.includes("lamp")) {
    if (!lampAvailable(state, plan)) errors.push("The sample lamp is not available.");
    else {
      next.lampLit = true;
      effects.push("Sample lamp on. The plants stay healthy.");
    }
  }

  if (state.stage === 1) {
    if (!plan.pipeFixed) errors.push("Turn the pipe until both ends line up.");
    next.pipeFixed = true;
    effects.unshift("Habitat air is flowing again.");
    if (plan.installSpare) {
      if (!has(state, "spare") || state.spareInstalled)
        errors.push("There is no spare joint to install.");
      else {
        next.spareInstalled = true;
        effects.push("Spare joint installed: shelter air needs only 1 power.");
      }
    }
  }
  if (state.stage === 2) {
    if (!plan.workshop) errors.push("Choose: keep the workshop or take it apart.");
    next.workshop = plan.workshop;
    if (plan.workshop === "dismantle")
      effects.unshift("Workshop taken apart: one workshop battery.");
    else if (plan.workshop === "keep")
      effects.unshift("Workshop kept. The sample cooler keeps running.");
    next.requests.commander = next.forecast !== "none";
  }
  if (state.stage === 3) {
    const seen = new Map<WallId, number>();
    plan.wall.forEach((id) => id && seen.set(id, (seen.get(id) ?? 0) + 1));
    const allowed = wallables(state, plan);
    for (const [id, count] of seen) {
      if (!allowed.includes(id))
        errors.push(`The ${wallName(id).toLowerCase()} cannot be in the wall.`);
      if (count !== (id === "tank" ? 2 : 1))
        errors.push(`The ${wallName(id).toLowerCase()} is placed wrong.`);
    }
    if (plan.wall[SHELTER_CELL]) errors.push("The crew waits in the middle.");
    if (!ventsOpen(plan.wall).length && !state.spareInstalled)
      errors.push("We need one vent open to breathe. Open A2 or C2.");
    next.wall = [...plan.wall];
    next.shield = shieldOf(plan.wall);
    if (next.shield < state.mission.storm.need)
      risks.push(
        `Will this be enough? This storm needs a shield of ${state.mission.storm.need}.`,
      );
    effects.unshift(`Shelter wall locked: shield ${next.shield} of 8.`);
    next.requests.technician =
      state.forecast === "arrived"
        ? plan.wall.includes("tank")
        : ventsOpen(plan.wall).length > 0;
  }
  if (state.stage === 4) {
    next.crewMoved = plan.moveCrew;
    if (!plan.moveCrew)
      risks.push("The crew has no order to move. They will stay in the habitat.");
    effects.unshift(
      !plan.moveCrew
        ? "The crew waited out the storm in the habitat."
        : state.shield >= state.mission.storm.need
          ? "The crew sheltered behind a strong enough wall."
          : "The crew sheltered, but the wall had gaps.",
    );
    next.requests.researcher = has(state, "research")
      ? plan.power.includes("lamp")
      : has(state, "kit")
        ? plan.power.includes("garden")
        : plan.moveCrew;
  }
  if (state.stage === 5 && next.food < 2)
    risks.push("Two more meals until rescue. The plates won't be full.");

  eat(next, effects);
  return { next, errors: [...new Set(errors)], risks, effects, power };
}

/** Moves to the next stage; Earth's reply arrives at the start of the following shift. */
export function advance(state: State): State {
  const next: State = { ...state, stage: (state.stage + 1) as Stage };
  if (state.forecast === "sent") next.forecast = "arrived";
  if (next.stage === PICKUP) {
    // The rescue lander arrives; the crew eats the last meal automatically.
    eat(next, []);
  }
  return next;
}

export const isProtected = (state: State) =>
  state.crewMoved && state.shield >= state.mission.storm.need;
export const ending = (state: State) =>
  isProtected(state) && state.missed === 0 ? "safe" : "rescue";

/**
 * Fewest particles the shelter can let in, as a share of the habitat.
 * NASA Artemis I (MARE): dose rates differed about 4x between Orion's most and least
 * shielded spots, so the best wall in the game lets in 1/4 of the habitat's particles.
 */
export const BEST_SHELTER_SHARE = 0.25;
/** Thickest wall the crew can build: one vent stays open for air unless the spare joint is in. */
export const maxShield = (state: State) => (state.spareInstalled ? 8 : 7);
/** Dose bars in percent of the habitat. A comparison scaled to Artemis I, not a measured dose. */
export function doseBars(state: State) {
  const max = maxShield(state);
  const shelter = (shield: number) =>
    Math.round(100 * (1 - (1 - BEST_SHELTER_SHARE) * Math.min(shield, max) / max));
  return {
    habitat: 100,
    yours: state.crewMoved ? shelter(state.shield) : 100,
    full: shelter(max),
  };
}

export type Badge = "strong" | "scientist" | "crew" | "lightning";
export const BADGES: Record<Badge, { name: string; how: string }> = {
  strong: { name: "Strong Shield", how: "Shield 6 or more during the storm." },
  scientist: { name: "Moon Scientist", how: "Research sent to Earth in Shift 5." },
  crew: { name: "Crew Buddy", how: "All three crew requests met." },
  lightning: { name: "Lightning", how: "Cargo packed in 60 seconds with the timer on." },
};
export function earnedBadges(state: State, fastCargo: boolean): Badge[] {
  const list: Badge[] = [];
  if (state.crewMoved && state.shield >= 6) list.push("strong");
  if (state.researchSent) list.push("scientist");
  if (Object.values(state.requests).every(Boolean)) list.push("crew");
  if (fastCargo) list.push("lightning");
  return list;
}

/** One cause-and-effect sentence that really happened, plus one thing to try. */
export function lesson(state: State): { text: string; tip: string } {
  const need = state.mission.storm.need;
  if (!state.crewMoved)
    return {
      text: "The crew stayed in the habitat, so more particles reached them.",
      tip: "Next time, press Move crew in Shift 4.",
    };
  if (state.shield < need) {
    const early = state.usedBeforeStorm[0];
    if (early)
      return {
        text: `The ${wallName(early).toLowerCase()} was used before the storm, so it could not be a wall.`,
        tip: `Try this next time: keep the ${wallName(early).toLowerCase()} on the shelf.`,
      };
    if (state.forecast !== "arrived")
      return {
        text: "Without Earth's warning, the water tank was too heavy to move.",
        tip: "Try this next time: use the radio early to ask about the Sun.",
      };
    return {
      text: "Gaps in the wall let particles through.",
      tip: "Try this next time: pack items that can become walls.",
    };
  }
  if (state.missed > 0)
    return state.cargo.includes("kit") && state.gardenCare < 2
      ? {
          text: "The garden needed one more care turn, so a meal was missing.",
          tip: "Try this next time: care for the garden in two different shifts.",
        }
      : state.cargo.includes("food") && !state.foodOpened
        ? {
            text: "The food pack stayed closed, so a meal was missing.",
            tip: "Try this next time: open the food pack after the storm.",
          }
        : {
            text: "No food was packed, so the crew was one meal short.",
            tip: "Try this next time: pack food or the garden kit.",
          };
  if (state.wall.includes("tank"))
    return {
      text: "You asked Earth early, so the crew moved the water tank. Water is a great shield.",
      tip: "Try a New Mission with a bigger storm.",
    };
  if (state.wall.includes("food"))
    return {
      text: "You kept the food pack in the wall, so the shield was enough. It still opened after the storm.",
      tip: "Try this next time: ask Earth early and use the water tank.",
    };
  return {
    text: "Thick stuff between the crew and the Sun kept them safe.",
    tip: "Try this next time: leave the battery on the shelf for a thicker wall.",
  };
}

/** The path this session took, for the debrief branch map. */
export function branchPath(state: State) {
  return [
    { label: "Cargo", ok: state.cargo.includes("food") || state.cargo.includes("kit") },
    { label: "Forecast", ok: state.forecast === "arrived" },
    { label: "Shield", ok: state.shield >= state.mission.storm.need },
    { label: "Food", ok: state.missed === 0 },
    { label: ending(state) === "safe" ? "Safe and Sound" : "Rescue at Last", ok: ending(state) === "safe" },
  ];
}

// ---------------------------------------------------------------- session
export interface Session {
  state: State;
  plan: Plan;
  phase: Phase;
  last: { stage: Stage; effects: string[]; before: State } | null;
}
export type SessionAction =
  | { type: "plan"; plan: Plan }
  | { type: "begin" }
  | { type: "commit"; acceptRisk?: boolean }
  | { type: "result" }
  | { type: "continue" }
  | { type: "replay" }
  | { type: "restart"; mission?: Mission };

export function initialSession(mission: Mission = MISSION_1): Session {
  const state = initialState(mission);
  return { state, plan: makePlan(state), phase: "brief", last: null };
}

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case "restart":
      return initialSession(action.mission ?? session.state.mission);
    case "replay": {
      // "Ulang dari S1": same mission and cargo, fresh outpost.
      const state = {
        ...initialState(session.state.mission),
        cargo: [...session.state.cargo],
        stage: 1 as Stage,
      };
      return { state, plan: makePlan(state), phase: "brief", last: null };
    }
    case "plan":
      return session.phase === "play" ? { ...session, plan: action.plan } : session;
    case "begin":
      return session.phase === "brief" ? { ...session, phase: "play" } : session;
    case "commit": {
      if (session.phase !== "play" || session.state.stage > 5) return session;
      const result = evaluate(session.state, session.plan);
      if (result.errors.length || (result.risks.length && !action.acceptRisk))
        return session;
      return {
        ...session,
        state: result.next,
        phase: "running",
        last: { stage: session.state.stage, effects: result.effects, before: session.state },
      };
    }
    case "result":
      return session.phase === "running" ? { ...session, phase: "result" } : session;
    case "continue": {
      if (session.phase !== "result" && session.state.stage !== PICKUP)
        return session;
      if (session.state.stage >= DEBRIEF) return session;
      const state = advance(session.state);
      return {
        state,
        plan: makePlan(state),
        phase: state.stage === PICKUP ? "result" : state.stage === DEBRIEF ? "play" : "brief",
        last:
          state.stage === PICKUP
            ? {
                stage: PICKUP,
                before: session.state,
                effects: [
                  session.state.food > 0
                    ? "The crew ate the last meal."
                    : "The crew missed the last meal.",
                  ...(state.researchSent ? ["Earth: data received!"] : []),
                ],
              }
            : null,
      };
    }
  }
}
