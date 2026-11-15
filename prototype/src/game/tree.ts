// The decision tree ("flowchart", after Detroit: Become Human): every choice point of a mission,
// one row each in story order, with the branches the player has found so far across all runs.
// Each run lights exactly one node per row, so the path through the rows is that run's story.
import { ending, type State } from "./rules";

export interface TreeNode {
  id: string;
  label: string;
  /** What this branch does, shown once the node is found. */
  detail: string;
  /** A nudge for a branch not found yet (never the full answer). */
  hint: string;
  test: (s: State) => boolean;
  /** Nodes further down that this branch makes possible or causes. */
  leads?: string[];
  tone?: "good" | "bad";
}
export interface TreeRow {
  id: string;
  when: string;
  title: string;
  nodes: TreeNode[];
}

const need = (s: State) => s.mission.storm.need;
const strong = (s: State) => s.shield >= need(s);

export const TREE: TreeRow[] = [
  {
    id: "cargo",
    when: "Opening",
    title: "What food goes in the backpack?",
    nodes: [
      { id: "cargo.food", label: "Food pack", detail: "+2 meals when opened. It can also sit in the wall during the storm and open after.", hint: "One item gives 2 meals at once.", test: (s) => s.cargo.includes("food") && !s.cargo.includes("kit"), leads: ["meals.fed", "wall.strong"] },
      { id: "cargo.kit", label: "Garden kit", detail: "+2 meals, but only after the garden is cared for in 2 shifts.", hint: "Something that grows food.", test: (s) => s.cargo.includes("kit") && !s.cargo.includes("food"), leads: ["meals.fed"] },
      { id: "cargo.both", label: "Food pack + garden", detail: "Two ways to get meals: the safest choice for food.", hint: "Could you pack two kinds of food?", test: (s) => s.cargo.includes("food") && s.cargo.includes("kit"), leads: ["meals.fed"] },
      { id: "cargo.none", label: "No food", detail: "5 meals in the outpost, 6 mealtimes until rescue. Someone goes hungry.", hint: "What if the backpack has no food at all?", test: (s) => !s.cargo.includes("food") && !s.cargo.includes("kit"), leads: ["meals.hungry"], tone: "bad" },
    ],
  },
  {
    id: "spare",
    when: "Shift 1",
    title: "Install the spare pipe joint?",
    nodes: [
      { id: "spare.in", label: "Joint installed", detail: "The shelter air needs less power, so the wall can close both air vents: a thicker wall.", hint: "Pack the spare pipe joint and fix it in.", test: (s) => s.spareInstalled, leads: ["wall.strong", "wall.tank"] },
      { id: "spare.out", label: "No spare joint", detail: "One air vent must stay open in the wall so the crew can breathe.", hint: "Skip the spare joint.", test: (s) => !s.spareInstalled },
    ],
  },
  {
    id: "radio",
    when: "Shift 1–2",
    title: "Call Earth on the radio?",
    nodes: [
      { id: "radio.called", label: "Called Earth", detail: "NASA's warning arrives next shift, early enough to move the heavy water tank.", hint: "The radio only reaches Earth in some shifts.", test: (s) => s.forecast !== "none", leads: ["wall.tank"], tone: "good" },
      { id: "radio.silent", label: "No call", detail: "The storm comes with no warning: about 1 hour to build, too short for the water tank.", hint: "Leave the radio off.", test: (s) => s.forecast === "none", leads: ["wall.gaps"] },
    ],
  },
  {
    id: "workshop",
    when: "Shift 2",
    title: "Keep the workshop or take it apart?",
    nodes: [
      { id: "workshop.keep", label: "Kept it", detail: "Its sample lamp can keep the research plants alive during the storm.", hint: "Keep it standing.", test: (s) => s.workshop === "keep", leads: ["science.sent"] },
      { id: "workshop.apart", label: "Took it apart", detail: "You get a workshop battery: +1 power, or one more cell of wall.", hint: "Take it apart.", test: (s) => s.workshop === "dismantle", leads: ["wall.strong"] },
    ],
  },
  {
    id: "wall",
    when: "Shift 3",
    title: "How strong is the storm wall?",
    nodes: [
      { id: "wall.tank", label: "Water wall", detail: "Water is a great shield. Only possible after Earth's warning.", hint: "Needs Earth's warning first.", test: (s) => s.wall.includes("tank") && strong(s), leads: ["end.safe"], tone: "good" },
      { id: "wall.strong", label: "Strong enough", detail: "Heavy crates and packs reach the shield this storm needs.", hint: "Fill the wall with heavy things.", test: (s) => strong(s) && !s.wall.includes("tank"), leads: ["end.safe"], tone: "good" },
      { id: "wall.gaps", label: "Wall with gaps", detail: "Below the shield this storm needs: particles slip through.", hint: "What if the wall is too thin?", test: (s) => !strong(s), leads: ["end.rescue"], tone: "bad" },
    ],
  },
  {
    id: "crew",
    when: "Shift 4",
    title: "Move the crew into the shelter?",
    nodes: [
      { id: "crew.moved", label: "Into the shelter", detail: "The crew waits behind the wall: up to 4 times fewer particles.", hint: "Press Move crew.", test: (s) => s.crewMoved, leads: ["end.safe"], tone: "good" },
      { id: "crew.stayed", label: "Stayed in habitat", detail: "A wall can't protect anyone who isn't behind it.", hint: "What if nobody moves?", test: (s) => !s.crewMoved, leads: ["end.rescue"], tone: "bad" },
    ],
  },
  {
    id: "meals",
    when: "Shift 5",
    title: "Did every meal get eaten?",
    nodes: [
      { id: "meals.fed", label: "Every meal eaten", detail: "6 meals for 6 mealtimes. Nobody went hungry.", hint: "Make sure there is food for every shift.", test: (s) => s.missed === 0, leads: ["end.safe"], tone: "good" },
      { id: "meals.hungry", label: "A meal missed", detail: "An empty plate: the ending can't be Safe and Sound.", hint: "What if the food runs out?", test: (s) => s.missed > 0, leads: ["end.rescue"], tone: "bad" },
    ],
  },
  {
    id: "science",
    when: "Shift 5",
    title: "Did the plant research reach Earth?",
    nodes: [
      { id: "science.sent", label: "Research sent", detail: "Real NASA plant study data reaches Earth: the Moon Scientist badge.", hint: "Pack the research crate, keep its plants alive, then radio Earth.", test: (s) => s.researchSent, tone: "good" },
      { id: "science.kept", label: "Packed, not sent", detail: "The research crate came along, but its data never reached Earth.", hint: "Pack the research crate but don't send it.", test: (s) => s.cargo.includes("research") && !s.researchSent },
      { id: "science.none", label: "No research", detail: "The research crate stayed behind. It takes 2 backpack slots.", hint: "Leave the research crate.", test: (s) => !s.cargo.includes("research") },
    ],
  },
  {
    id: "end",
    when: "Ending",
    title: "How did the mission end?",
    nodes: [
      { id: "end.safe", label: "Safe and Sound", detail: "Shielded and fed: everyone goes home healthy.", hint: "Strong wall + crew inside + every meal.", test: (s) => ending(s) === "safe", tone: "good" },
      { id: "end.rescue", label: "Rescue at Last", detail: "Everyone goes home, but too many particles or an empty plate.", hint: "What happens if something goes wrong?", test: (s) => ending(s) === "rescue", tone: "bad" },
    ],
  },
];

export const TREE_NODES = TREE.flatMap((row) => row.nodes);
/** The node each row lit up in this run, in row order. */
export const runPath = (state: State) => TREE.map((row) => row.nodes.find((n) => n.test(state))!.id);
/** Nodes that point at this one (what it needs). */
export const needsOf = (id: string) => TREE_NODES.filter((n) => n.leads?.includes(id)).map((n) => n.id);
