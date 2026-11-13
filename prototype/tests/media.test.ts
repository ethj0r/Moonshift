import { describe, expect, it } from "vitest";
import { barNotes, MOODS, type Mood } from "../src/audio";

describe("generative music", () => {
  it("plays a 4-note pad every bar and keeps the melody in the mood's scale", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const mood of Object.keys(MOODS) as Mood[]) {
      const m = MOODS[mood];
      let lead = 4;
      for (let bar = 0; bar < 32; bar++) {
        const out = barNotes(mood, bar, rand, lead);
        lead = out.lead;
        expect(out.notes.filter((n) => n.voice === "pad")).toHaveLength(4);
        for (const n of out.notes.filter((n) => n.voice === "lead")) expect(m.scale).toContain((((n.midi - m.root) % 12) + 12) % 12);
      }
    }
  });
});
