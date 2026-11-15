// What this run's choices did, in the words a 7–12 year old can follow.
// Everything here is read from the final State, so the report always explains *this* run.
import { CARGO, doseBars, ending, VENTS, wallName, type Crew, type State } from "./rules";

/** The crew eats once in each of the 5 shifts and once more while the rescue lander waits. */
export const MEALS_NEEDED = 6;

/** The one headline outcome; "exposed" and "thin" are both the Rescue-at-Last ending. */
export type Outcome = "safe" | "exposed" | "thin" | "hungry";
export function outcome(state: State): Outcome {
  if (!state.crewMoved) return "exposed";
  if (state.shield < state.mission.storm.need) return "thin";
  if (state.missed > 0) return "hungry";
  return "safe";
}

export type Particles = "low" | "some" | "high";
export function particles(state: State): Particles {
  const o = outcome(state);
  return o === "exposed" ? "high" : o === "thin" ? "some" : "low";
}

/** Each crew request, the lesson from this run, and the other path to consider. */
export function crewWishes(state: State): Record<Crew, {
  wish: string;
  when: string;
  met: boolean;
  why: string;
  alternate: string;
}> {
  const forecastArrived = state.forecast !== "none";
  const tankInWall = state.wall.includes("tank");
  const ventOpen = VENTS.some((cell) => !state.wall[cell]);
  const stormNeed = state.mission.storm.need;
  const hasResearch = state.cargo.includes("research");
  const hasGarden = state.cargo.includes("kit");

  return {
    commander: {
      wish: `Call Earth in shift ${state.mission.windows[0]}`,
      when: `Shift ${state.mission.windows[0]}`,
      met: state.requests.commander,
      why: forecastArrived
        ? tankInWall
          ? `NASA's Moon plans include moving supplies like water around a storm shelter. More material can stop some Sun particles. Earth's warning arrived next shift, so you could move the tank; in the game, it added 2 shield cells.`
          : `NASA's Moon plans include moving supplies like water around a storm shelter. Earth replied next shift, making the tank available, but you used other materials. Your wall has ${state.shield} cells; this storm needs ${stormNeed}.`
        : `NASA's Moon plans include moving supplies like water around a storm shelter to stop some Sun particles. No warning arrived, so the tank could not be moved in time; your other supplies made a wall with ${state.shield} cells, and this storm needed ${stormNeed}.`,
      alternate: forecastArrived
        ? `Without the call, there would be no warning and too little time to move the tank. Other supplies could still make a wall strong enough for this storm (${stormNeed} shield cells).`
        : `A call in Shift ${state.mission.windows[0]} sends a message to Earth. The warning arrives next shift, early enough to move the tank (+2 shield cells if you use it).`,
    },
    technician: {
      wish: state.forecast === "arrived" ? "Use the water tank" : "Keep one air vent open",
      when: "Shift 3",
      met: state.requests.technician,
      why: forecastArrived
        ? tankInWall
          ? `The heavy tank takes 2 wall spaces and adds 2 shield cells. Your wall has ${state.shield}; this storm needs ${stormNeed}.`
          : `Earth made the tank available. Placing it in the wall would add 2 shield cells; your wall has ${state.shield} and this storm needs ${stormNeed}.`
        : ventOpen
          ? state.spareInstalled
            ? `The open vent is one path for air, and your spare joint is another. Together they let you cover both vent spaces if those wall cells are needed.`
            : `The open vent leaves a path for air into the shelter while the wall blocks particles. Your wall has ${state.shield}; this storm needs ${stormNeed}.`
          : state.spareInstalled
            ? `The spare pipe joint routed air into the shelter, so both vent cells could be used in the wall. Your wall has ${state.shield}; this storm needs ${stormNeed}.`
            : `No vent is open and no spare joint routes air into the shelter. The crew needs an air path as well as a strong wall.`,
      alternate: forecastArrived
        ? tankInWall
          ? `Without the tank, other cargo would need to make up those 2 shield cells. The wall must reach ${stormNeed} to block this storm.`
          : `Using the tank adds 2 shield cells. If your other cargo already reaches ${stormNeed}, the tank may not change whether this storm is blocked.`
        : state.spareInstalled
          ? ventOpen
            ? `The spare joint supplies air to the shelter. Covering the last vent could add a wall cell, as long as the spare joint stays installed.`
            : `The spare joint carries air into the shelter, so every vent cell can help strengthen the wall.`
          : ventOpen
            ? `If every vent were covered, air could not reach the shelter. Keep one vent open, or install the spare joint first to route the air another way.`
            : `Leave one vent open or install the spare joint. The shelter needs an air path while the wall protects the crew.`,
    },
    researcher: {
      wish: hasResearch
        ? "Keep my plant lights on"
        : hasGarden
          ? "Don't forget the garden"
          : "Stay close to the shelter",
      when: "Shift 4",
      met: state.requests.researcher,
      why: hasResearch
        ? state.lampLit
          ? state.researchSent
            ? `The sample lamp kept the research plants healthy, and their results made it to Earth over the radio.`
            : `The sample lamp kept the research plants healthy. Their results can be sent to Earth when the radio window opens.`
          : `The sample lamp is the plants' life support. They need light to stay healthy so their results can be sent to Earth.`
        : hasGarden
          ? state.wall.includes("kit")
            ? `The garden kit went into the wall, so it could not grow food. Kept for the garden, it needs care on 2 different shifts to make 2 meals.`
            : state.gardenCare >= 2
            ? `Care on 2 different shifts helped the garden grow 2 extra meals. Plants need repeated care before they can make food.`
            : state.gardenCare === 1
              ? `This was 1 of 2 care turns. The garden needs care on a second shift before it can grow 2 extra meals.`
              : `The garden got no care this run, so it grew no extra food. It needs care on 2 different shifts to make 2 meals.`
          : state.crewMoved
            ? state.shield >= stormNeed
              ? `Moving the crew behind the wall let it block the storm. Your wall had ${state.shield} shield cells; this storm needed ${stormNeed}.`
              : `Moving the crew put them behind the wall, but it had ${state.shield} shield cells and this storm needed ${stormNeed}. Gaps let some particles through.`
            : `The crew stayed in the habitat, so the wall could not protect them. It also needed ${stormNeed} shield cells to block this storm.`,
      alternate: hasResearch
        ? state.lampLit
          ? `Without the sample lamp, the plants would not be ready, so their research data could not be sent to Earth.`
          : `Keep the workshop and power the sample lamp. Healthy plants can send their research results to Earth when the radio window opens.`
        : hasGarden
          ? state.wall.includes("kit")
            ? `Keep the kit out of the wall if the crew needs garden food. Care for it on 2 different shifts to harvest +2 meals.`
            : state.requests.researcher
            ? `Skipping this care turn leaves fewer chances to care for the garden twice. It needs 2 care turns on different shifts to grow +2 meals.`
            : `Care for the garden on 2 different shifts. After the second care turn, it grows +2 meals.`
          : state.crewMoved
            ? `If the crew stayed in the habitat, the wall could not shield them and more particles would reach them.`
            : `Move the crew into the shelter before the storm. A wall that reaches ${stormNeed} shield cells can block its particles.`,
    },
  };
}

/** One line under the headline: what happened to the crew, without numbers. */
export function verdict(state: State): string {
  const missed = state.missed;
  const meal = missed === 1 ? "one meal was missing" : `${missed} meals were missing`;
  switch (outcome(state)) {
    case "safe":
      return "Everyone was shielded from the storm and ate every meal.";
    case "exposed":
      return `The crew stayed in the habitat, so lots of particles reached them${missed ? `, and ${meal}` : ""}.`;
    case "thin":
      return `The crew hid in the shelter, but the wall had gaps, so some particles got through${missed ? `, and ${meal}` : ""}.`;
    case "hungry":
      return `The wall kept the particles out, but ${meal}.`;
  }
}

/** Short caption for the 3D health check shot of the rescue cutscene. */
export function healthCheckCaption(state: State): string {
  switch (outcome(state)) {
    case "safe":
      return "Health check: **no extra {d:particles}**, and every {f:meal} eaten. Hooray!";
    case "exposed":
      return "Health check: the crew stayed in the habitat, so **lots of {d:particles}** reached them.";
    case "thin":
      return "Health check: the wall had gaps, so **some {d:particles}** got through.";
    case "hungry":
      return `Health check: safe from {d:particles}, but **${state.missed === 1 ? "a meal was" : `${state.missed} meals were`} missing**.`;
  }
}

export type Step = {
  key: "food" | "radio" | "wall" | "crew" | "meals";
  when: string;
  /** Two to four words: the headline of the card. */
  title: string;
  /** Which rendered model illustrates it (public/assets/report/<art>.webp). */
  art: string;
  /** What you did, in one short line. */
  chose: string;
  /** What that caused. */
  led: string;
  good: boolean;
  /** True when this step is why the ending was not Safe and Sound. */
  decisive: boolean;
  /** What the other choice would have done (only for steps that went wrong). */
  instead?: string;
};

/** The chain of choices that decided the ending, in story order. */
export function choiceChain(state: State): Step[] {
  const need = state.mission.storm.need;
  const food = state.cargo.includes("food");
  const kit = state.cargo.includes("kit");
  const called = state.forecast !== "none";
  const strong = state.shield >= need;
  const packed = state.cargo.length ? state.cargo.map((id) => CARGO[id].name).join(", ") : "Nothing";
  const early = state.usedBeforeStorm[0];
  const o = outcome(state);
  const hungry = state.missed > 0;
  return [
    {
      key: "food",
      when: "Opening",
      title: food && kit ? "Packed food + garden" : food ? "Packed the food pack" : kit ? "Packed the garden kit" : "Packed no food",
      art: food ? "food" : kit ? "kit" : "supply",
      chose: `Packed: ${packed}.`,
      led: food || kit ? "Extra food for later shifts." : "No extra food: 5 meals for 6 mealtimes.",
      good: food || kit,
      decisive: hungry && !food && !kit,
      instead: food || kit ? undefined : "Packing the food pack or the garden kit gives +2 meals.",
    },
    {
      key: "radio",
      when: `Shift ${state.mission.windows[0]}`,
      title: called ? "Called Earth" : "Didn't call Earth",
      art: "radio",
      chose: called ? "Called Earth on the radio." : "Did not call Earth.",
      led: called
        ? "Earth's warning came early, so the heavy water tank could join the wall."
        : "No warning: only 1 hour to build, too short to move the water tank.",
      good: called,
      decisive: !called && o === "thin",
      instead: called ? undefined : "With Earth's warning, the water tank adds 2 thick cells to the wall.",
    },
    {
      key: "wall",
      when: "Shift 3",
      title: `Built a shield of ${state.shield}`,
      art: "supply",
      chose: `Built a wall with shield ${state.shield} of 8.`,
      led: strong
        ? `This storm needed ${need}. Enough to block the particles.`
        : `This storm needed ${need}. Gaps let particles through.${early ? ` The ${wallName(early).toLowerCase()} was already used up before the storm.` : ""}`,
      good: strong,
      decisive: o === "thin",
      instead: strong ? undefined : `Fill the gaps with heavy things until the shield reaches ${need}.`,
    },
    {
      key: "crew",
      when: "Shift 4",
      title: state.crewMoved ? "Crew into the shelter" : "Crew stayed in habitat",
      art: state.crewMoved ? "crew-b-calm-bust" : "crew-b-worried-bust",
      chose: state.crewMoved ? "Moved the crew into the shelter." : "Left the crew in the habitat.",
      led: state.crewMoved
        ? strong
          ? "They waited out the storm behind the wall."
          : "They hid, but behind a thin wall."
        : "The wall can't help anyone who isn't behind it.",
      good: state.crewMoved,
      decisive: o === "exposed",
      instead: state.crewMoved ? undefined : "Pressing Move crew puts them behind the wall: up to 4 times fewer particles.",
    },
    {
      key: "meals",
      when: "Shift 5",
      title: `${MEALS_NEEDED - state.missed} of ${MEALS_NEEDED} meals eaten`,
      art: kit && !food ? "garden" : "food",
      chose: `The crew ate ${MEALS_NEEDED - state.missed} of ${MEALS_NEEDED} meals.`,
      led: hungry
        ? kit && state.gardenCare < 2
          ? "The garden got only one care, so its food never grew."
          : food && !state.foodOpened
            ? "The food pack stayed closed."
            : "There was not enough food for every mealtime."
        : "Nobody went hungry.",
      good: !hungry,
      decisive: hungry,
      instead: hungry
        ? kit && state.gardenCare < 2
          ? "Caring for the garden in two shifts harvests +2 meals."
          : food && !state.foodOpened
            ? "Opening the food pack after the storm adds +2 meals."
            : "Pack food at the start."
        : undefined,
    },
  ];
}

/** Particles in percent of "stayed in the habitat", for the crew check meters. */
export const crewDose = (state: State) => doseBars(state).yours;
export const bestDose = (state: State) => doseBars(state).full;
export const endingName = (state: State) => (ending(state) === "safe" ? "Safe and Sound" : "Rescue at Last");
