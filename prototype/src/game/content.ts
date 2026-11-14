// In-game text (English, per GDD). Lines come from "Lampiran: naskah petunjuk".
import { CARGO, shieldOf, slotsUsed, MAX_SLOTS, type CargoId, type Crew, type Plan, type Stage, type State, type WallId } from "./rules";
import type { IconName } from "../ui/Icons";

export type Speaker = Crew | "earth" | "beep";
export const SPEAKER: Record<Speaker, string> = {
  commander: "Commander",
  technician: "Technician",
  researcher: "Researcher",
  earth: "Earth",
  beep: "B.E.E.P.",
};
export interface Line {
  speaker: Speaker;
  text: string;
}

export const STAGE_TITLE: Record<Stage, string> = {
  0: "Save the cargo",
  1: "Fix the air",
  2: "Share power, call Earth",
  3: "Build the shelter wall",
  4: "Storm: protect the crew",
  5: "Last meals",
  6: "Rescue",
  7: "Debrief",
};

export function briefLine(state: State): Line {
  switch (state.stage) {
    case 0:
      return { speaker: "commander", text: "The lander hit hard. **Grab what you can carry.**" };
    case 1:
      return { speaker: "technician", text: "The air pipe is bent. **Turn it straight.**" };
    case 2:
      return state.mission.windows.includes(2)
        ? { speaker: "commander", text: "**Ask Earth** about the Sun." }
        : { speaker: "commander", text: "Power is short. Choose with care." };
    case 3:
      return { speaker: "commander", text: "**Big solar flare!** Particles in **about one hour**." };
    case 4:
      return { speaker: "commander", text: "**Solar storm!** **Move the crew** to the shelter." };
    case 5:
      return { speaker: "commander", text: "The storm is over. **Check the food.**" };
    default:
      return { speaker: "commander", text: "The rescue lander is here!" };
  }
}

/** Second bubble in the brief: Earth's reply and crew requests (GDD §9 "Permintaan kru"). */
export function extraLines(state: State): Line[] {
  const lines: Line[] = [];
  if (state.stage === 3 && state.forecast === "arrived")
    lines.push(
      state.mission.storm.key === "sep2017"
        ? { speaker: "earth", text: "Earth says: NASA saw a cloud leave the Sun at **2,650 km every second**. Their model **predicts** it will brush past us. Get ready!" }
        : { speaker: "earth", text: "Earth says: a big sunspot is very active. Get ready." },
    );
  if (state.stage === 3)
    lines.push(
      state.forecast === "arrived"
        ? { speaker: "technician", text: "We got your message! **Water stops radiation.** Use the tank!" }
        : { speaker: "technician", text: "We need one vent open to breathe." },
    );
  if (state.stage === 4)
    lines.push(
      state.cargo.includes("research")
        ? { speaker: "researcher", text: "Keep my plant lights on!" }
        : state.cargo.includes("kit")
          ? { speaker: "researcher", text: "Don't forget the garden." }
          : { speaker: "researcher", text: "Stay close to the shelter." },
    );
  return lines;
}

export interface Guess {
  /** What a kid needs to know first (scaffolding): one sentence under the diagram (ui/KnowArt), also spoken in Cadet. */
  know: string;
  question: string;
  /** hint: what picking this option means. Never says which one is right. */
  options: { label: string; icon: "cargo" | "food" | "power" | "air" | "crew" | "shield" | "radio" | "garden"; hint: string }[];
}
/** "Tebak" step: one guess per shift, never graded (Interaksi §4). S3 is a tap on the shelter grid (hints in CELL_HINT). */
export const GUESS: Partial<Record<Stage, Guess>> = {
  0: {
    know: "The Sun throws tiny particles. Heavy stuff makes a wall.",
    question: "Which of these could become a wall?",
    options: [
      { label: "Food pack", icon: "food", hint: "If you think heavy **food** blocks particles." },
      { label: "Battery", icon: "power", hint: "If you think a heavy **battery** blocks particles." },
      { label: "Crate", icon: "cargo", hint: "If you think a big **crate** blocks particles." },
    ],
  },
  1: {
    know: "The Moon has no wind. A fan sits at one end of the pipe.",
    question: "Where will the air go when the pipe is straight?",
    options: [
      { label: "Into the habitat", icon: "crew", hint: "If you think the **fan** pushes the air through." },
      { label: "It stays still", icon: "air", hint: "If you think air can't move here at all." },
    ],
  },
  2: {
    know: "3 power each shift: the air always uses 2, so 1 is free.",
    question: "If the radio turns on, what turns off?",
    options: [
      { label: "Garden lamp", icon: "garden", hint: "If you think the **radio** and the **garden** share the 1 free power." },
      { label: "The air", icon: "air", hint: "If you think the **radio** takes the air's power." },
      { label: "Nothing", icon: "power", hint: "If you think there's enough **power** for all." },
    ],
  },
  3: {
    know: "Particles fly straight: crates stop them, empty squares let them in.",
    question: "Guess first: where will particles get in?",
    options: [],
  },
  4: {
    know: "Each bar fills with the particles that get in.",
    question: "Which bar will fill faster?",
    options: [
      { label: "Habitat", icon: "crew", hint: "If you think thin walls let more in." },
      { label: "Shelter", icon: "shield", hint: "If you think the **shelter** lets more in." },
    ],
  },
  5: {
    know: "The crew eats 1 meal each shift. A dashed plate is a missing meal.",
    question: "Will every plate be full?",
    options: [
      { label: "Yes", icon: "food", hint: "If you think every plate gets a **meal**." },
      { label: "Not yet", icon: "food", hint: "If you think some plates stay empty." },
    ],
  },
};
/** S3 grid guess: what each square is, so a tap is a reasoned guess. */
export const CELL_HINT = {
  vent: "≋ **Air vent**: an open hole.",
  empty: "Empty: nothing here yet.",
};

/** Hint ladder levels 1 (crew speaks) and 2 (scan highlights). */
export function hint(state: State, level: 1 | 2): Line {
  const scan = (text: string): Line => ({ speaker: "beep", text });
  switch (state.stage) {
    case 0:
      return level === 1
        ? { speaker: "commander", text: "Grab what you can carry." }
        : scan("Use it, or save it as a wall.");
    case 1:
      return level === 1
        ? { speaker: "technician", text: "Turn it until both ends line up." }
        : scan("Drag around the pipe to turn it.");
    case 2:
      return level === 1
        ? { speaker: "commander", text: "Pick a door: keep or take apart." }
        : scan("One free power cell. Where will it go?");
    case 3:
      return level === 1
        ? { speaker: "technician", text: "What could block particles? Look at the shelf." }
        : scan("Which side has no wall yet?");
    case 4:
      return level === 1
        ? { speaker: "commander", text: "Time to move, everyone!" }
        : scan("Press Move crew.");
    default:
      return level === 1
        ? { speaker: "commander", text: "Two more meals until rescue." }
        : scan("Tap a plate to see what fills it.");
  }
}

export const AHA: Partial<Record<Stage, string>> = {
  0: "Every item can be **used**, or saved as a **wall**. **Not both.**",
  1: "Bip! On the Moon, fans push the air.",
  2: "Power is **shared**. One more thing on means **one less**.",
  3: "**Thick stuff** blocks particles. Even food and water!",
  4: "The shelter stops **most** particles, **not all**.",
  5: "Food added now **still counts** for tonight.",
};

export const WHY: Partial<Record<Stage, { cadet: string; specialist: string }>> = {
  0: {
    cadet: "Space is tight. Each thing has one job.",
    specialist: "Packing is a trade: an item you use for its effect can't also be mass in the wall.",
  },
  1: {
    cadet: "Air does not move by itself here.",
    specialist: "In low gravity, warm air doesn't rise much, so stale air sits still. Fans and pipes must push it.",
  },
  2: {
    cadet: "Earth is far. Messages wait for a window.",
    specialist: "A radio signal reaches Earth in about 1.3 seconds. Near the lunar south pole, Earth can dip below the horizon, so messages wait for a contact window.",
  },
  3: {
    cadet: "More stuff in the way, fewer particles get through.",
    specialist: "Shielding works by mass. Water is rich in hydrogen, which is good at slowing particles. NASA plans for Orion crews to pile supplies around themselves in a storm.",
  },
  4: {
    cadet: "The wall makes the dose smaller, not zero.",
    specialist: "No wall stops every particle. More mass means a lower dose. The shelter is always better than the habitat.",
  },
  5: {
    cadet: "Plan meals until help arrives.",
    specialist: "Food added during a shift is counted before that shift's meal, so a harvest now still feeds the crew tonight.",
  },
};

export interface DataPanel {
  /** One plain line for Cadet (ages 7-9): no units, no clock times. */
  kid: string;
  what: string;
  when: string;
  source: string;
}
/** Panel Data: always archive, never shown as live (Interaksi §11). */
export function dataPanel(state: State): DataPanel | null {
  const sep = state.mission.storm.key === "sep2017";
  switch (state.stage) {
    case 0:
      return { kid: `The ${state.mission.storm.label} storm`, what: `${state.mission.storm.label} solar storm`, when: "Mission card", source: sep ? "NASA DONKI" : "NOAA SWPC" };
    case 3:
      return sep
        ? { kid: "A giant flare. Particles came 70 minutes later.", what: "Solar flare X8.2 · protons 70 min later", when: "10 Sep 2017, 15:35 → 16:45 UTC", source: "NASA DONKI" }
        : { kid: "A giant flare on the Sun", what: "Big solar flare", when: "28 Oct 2003", source: "NOAA SWPC" };
    case 4:
      return sep
        ? { kid: "Particles: 150 times the warning level", what: "Protons >10 MeV passed 10 pfu · peak 1,493.5 pfu", when: "10–11 Sep 2017 · replayed faster", source: "NASA DONKI" }
        : { kid: "Particles: 3,000 times the warning level", what: "Protons >10 MeV · peak 29,500 pfu", when: "28–29 Oct 2003 · replayed faster", source: "NOAA SWPC" };
    case 5:
      return sep
        ? { kid: "The storm is over", what: "Storm over · 8.5 pfu", when: "14 Sep 2017", source: "NASA DONKI" }
        : { kid: "The storm is over", what: "Storm over", when: "Oct 2003", source: "NOAA SWPC" };
    default:
      return null;
  }
}

export interface DataSource {
  name: string;
  text: string;
  used: string;
  url: string;
}
const DONKI_URL = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/";
export const DATA_BOOK: DataSource[] = [
  { name: "NASA DONKI · space weather log", text: "NASA's diary of space weather. It logged the 10 Sep 2017 flare at 15:35 UTC and the particles at 16:45 UTC.", used: "Shift 3 warning time and Shift 3–5 storm panels", url: DONKI_URL },
  { name: "NASA DONKI · CME analysis and WSA-ENLIL forecast", text: "NASA measured the cloud from the Sun at 2,650 km/s. Its WSA-ENLIL model predicted the cloud would brush past Earth and Mars.", used: "Earth's reply to your radio message, debrief timeline", url: DONKI_URL },
  { name: "GOES satellites (via DONKI)", text: "Measure protons near Earth. The Moon is about as far from the Sun, so the numbers are a fair guide.", used: "Particle counts (pfu) in Shift 4", url: DONKI_URL },
  { name: "NOAA SWPC storm scale", text: "S1–S5 sizes for radiation storms. Bigger storms need thicker walls.", used: "How thick the wall must be", url: "https://www.swpc.noaa.gov/noaa-scales-explanation" },
  { name: "NASA Artemis I · MARE test", text: "Two test dummies rode in Orion and measured radiation. The best-protected spot got about 4 times less than the least protected.", used: "Dose bars: the best wall lets in 1/4", url: "https://www.dlr.de/en/latest/news/2024/orion-spacecraft-radiation-protection-tested-initial-findings-from-artemis-i-moon-mission" },
  { name: "NASA OSDR · OSD-267", text: "Red lettuce grown on the Space Station in 2014, compared with lettuce grown on Earth.", used: "The research crate's plant samples", url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-267" },
];

/** Real event chain for the debrief timeline (NASA DONKI, linked events of 10 Sep 2017). */
export const STORM_TIMELINE: Partial<Record<State["mission"]["storm"]["key"], { time: string; kid: string; what: string }[]>> = {
  sep2017: [
    { time: "15:35", kid: "Flare", what: "X8.2 flare" },
    { time: "16:09", kid: "Cloud leaves the Sun", what: "CME, 2,650 km/s" },
    { time: "16:45", kid: "Particles arrive", what: "Protons >10 MeV" },
    { time: "13 Sep", kid: "Model: cloud brushes Earth", what: "WSA-ENLIL: glancing blow at Earth" },
  ],
};

export const GLOSSARY: Record<string, string> = {
  "Solar flare": "A bright flash on the Sun. It can send fast particles our way.",
  Particles: "Tiny bits flying from the Sun, faster than anything on Earth.",
  Shield: "Stuff between you and the particles. Thicker is better.",
  "Contact window": "The time when our radio can see Earth.",
  DONKI: "NASA's diary of space weather.",
  Dose: "How many particles reached your body.",
};

// ---------------------------------------------------------------- decision clues
/** One side of a trade-off: what you get, with an icon. */
export interface ClueSide {
  icon: IconName;
  label: string;
  text: string;
}
/**
 * Decision clue (Interaksi §7, level 0): shows what each option gives and costs, plus one
 * question tied to the mission's numbers. Never says which option is right.
 */
export interface Clue {
  title: string;
  a: ClueSide;
  b?: ClueSide;
  think: string;
}

const MEALS_NEEDED = 6;
function needs(state: State, plan: Plan) {
  const shield = state.stage === 3 ? shieldOf(plan.wall) : state.shield;
  return { shield, need: state.mission.storm.need };
}

export function clue(state: State, plan: Plan, id: string): Clue | null {
  const { shield, need } = needs(state, plan);
  const shiftsLeft = 6 - Math.max(1, state.stage); // meals still to eat, incl. pickup
  const early = state.stage < 3; // items can still become a wall in S3
  const wallSide: ClueSide = { icon: "shield", label: "Save it", text: "**+1** shield cell in the wall (Shift 3)" };
  if (id.startsWith("cargo:")) {
    const c = id.slice(6) as CargoId;
    const room = MAX_SLOTS - slotsUsed(plan.cargo);
    const why: Record<CargoId, string> = {
      battery: "Only **1** power is free each shift. When would **+1** help most?",
      food: `The crew needs **${MEALS_NEEDED}** meals. They have **${state.food}**.`,
      kit: "Plants need care in **two different shifts** before they give food.",
      spare: "In the storm the crew breathes in the shelter. Air costs power.",
      research: "Science needs the **workshop**, a **lamp** in the storm and the **radio** at the end.",
    };
    return {
      title: `${CARGO[c].name} · ${CARGO[c].slots} slot${CARGO[c].slots > 1 ? "s" : ""}${CARGO[c].slots > room ? " (no room!)" : ""}`,
      a: { icon: c === "research" ? "research" : c === "food" || c === "kit" ? "food" : c === "battery" ? "power" : "air", label: "Use it", text: CARGO[c].use },
      b: c === "research" ? { icon: "lock", label: "Wall", text: "Can't be a wall" } : wallSide,
      think: why[c],
    };
  }
  switch (id) {
    case "spare":
      return {
        title: "Spare pipe joint",
        a: { icon: "air", label: "Click it in", text: "Shelter air costs **1** power, not 2, in the storm" },
        b: wallSide,
        think: "In the storm, what will you be short of: **power** or **shield**?",
      };
    case "door:keep":
    case "door:dismantle":
      return {
        title: "The workshop",
        a: { icon: "research", label: "Keep it", text: "Its **lamp** can keep plant samples alive" },
        b: { icon: "power", label: "Take apart", text: "Get a **workshop battery**: +1 power, or a wall cell" },
        think: state.cargo.includes("research")
          ? "You packed the **research crate**. What do the samples need?"
          : "No research crate on board. What would help the crew most?",
      };
    case "radio":
      return state.stage === 5
        ? {
            title: "Radio",
            a: { icon: "mail", label: "Send", text: "Plant data goes to Earth · **1** power" },
            think: "Earth can hear us now. Is there research to send? (Real NASA plant data: OSDR study OSD-267.)",
          }
        : {
            title: "Radio",
            a: { icon: "mail", label: "Ask Earth", text: "Costs **1** power now. The reply comes **next shift**" },
            think: `Earth hears us only in **S${state.mission.windows.join("** and **S")}**. Could news about the Sun help you build the wall?`,
          };
    case "battery":
    case "workshopBattery":
      return {
        title: id === "battery" ? "Spare battery" : "Workshop battery",
        a: { icon: "power", label: "Plug in", text: "**+1** power, **this shift only**" },
        b: early ? wallSide : undefined,
        think: "Is anything waiting for power this shift?",
      };
    case "foodpack":
      return {
        title: "Food pack",
        a: { icon: "food", label: "Open", text: "**+2** meals now. It can't be closed again" },
        b: early ? wallSide : undefined,
        think: `Meals: **${state.food}**. Meals still to eat: **${shiftsLeft}**.`,
      };
    case "garden":
      return {
        title: "Garden",
        a: { icon: "garden", label: state.gardenCare === 1 ? "Harvest" : "Care", text: state.gardenCare === 1 ? "**+2** meals · **1** power" : "Lights on · **1** power. Needs one more care later" },
        think: `Cares: **${state.gardenCare}/2**, in different shifts. Meals: **${state.food}**, still to eat: **${shiftsLeft}**.`,
      };
    case "lamp":
      return {
        title: "Sample lamp",
        a: { icon: "research", label: "Light it", text: "Plant samples stay healthy · **1** power" },
        think: "Without light in the storm, can the research reach Earth?",
      };
  }
  if (id.startsWith("pick:")) {
    const w = id.slice(5) as WallId;
    const usable = w in CARGO ? CARGO[w as CargoId].use : null;
    return {
      title: w === "tank" ? "Water tank" : w.startsWith("supply") ? "Supply crate" : CARGO[w as CargoId]?.name ?? "Item",
      a: { icon: "shield", label: "Wall", text: w === "tank" ? "Water blocks a lot: **2** cells" : "**+1** shield cell" },
      b: usable ? { icon: "lock", label: "But then", text: `No more: ${usable}` } : undefined,
      think: `Shield now **${shield}**, the storm needs **${need}**. Which side is still open?`,
    };
  }
  return null;
}
