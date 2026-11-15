// What this run's choices did, in the words a 7–12 year old can follow.
// Everything here is read from the final State, so the report always explains *this* run.
import { CARGO, doseBars, ending, wallName, type Crew, type State } from "./rules";

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

/** What each crew member asked B.E.E.P. for, and whether it happened. */
export function crewWishes(state: State): Record<Crew, { wish: string; met: boolean }> {
  return {
    commander: { wish: `Call Earth in shift ${state.mission.windows[0]}`, met: state.requests.commander },
    technician: {
      wish: state.forecast === "arrived" ? "Use the water tank" : "Keep one air vent open",
      met: state.requests.technician,
    },
    researcher: {
      wish: state.cargo.includes("research")
        ? "Keep my plant lights on"
        : state.cargo.includes("kit")
          ? "Don't forget the garden"
          : "Stay close to the shelter",
      met: state.requests.researcher,
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
