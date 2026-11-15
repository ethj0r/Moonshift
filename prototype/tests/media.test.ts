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

import { existsSync } from "node:fs";
import VOICE from "../src/voice.json";
import { GUESS } from "../src/game/content";
import { cutscene } from "../src/game/cutscenes";
import { initialState } from "../src/game/rules";
import { plain } from "../src/ui/Rich";

describe("voiceover clips", () => {
  it("has a file for every line and still matches the guess script", () => {
    for (const file of Object.values(VOICE)) expect(existsSync(`public/assets/voice/${file}`), file).toBe(true);
    // If a line is edited, its clip silently falls back to the browser voice: regenerate it.
    for (const g of Object.values(GUESS)) expect(VOICE).toHaveProperty([plain(`${g.know} ${g.question}`)]);
    // The opening teaches the goal and the shift loop: every caption must have its narrator clip.
    for (const shot of cutscene("opening", initialState())) expect(VOICE).toHaveProperty([plain(shot.caption).replace(/\s+/g, " ").trim()]);
  });
});
