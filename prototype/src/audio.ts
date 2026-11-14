// Sound for MOONSHIFT, synthesized with Web Audio: no files, no licences, nothing added to the download.
// Music is generative: a soft pad, a bass note and a sparse pentatonic melody per mood. Calm and cosy like a
// miniature-settlement game; the storm mood is a slower minor key with a soft pulse, never scary (GDD: no frightening content).

export type Mood = "calm" | "tense" | "warm";
export type Sfx =
  | "tap"
  | "tick"
  | "pickup"
  | "place"
  | "pack"
  | "unpack"
  | "success"
  | "chime"
  | "whoosh"
  | "beep"
  | "nope"
  | "thud"
  | "flare"
  | "radio"
  | "crackle"
  | "fanfare";

/** Chords are semitones from the root (I–vi–IV–V, i–VI–VII–v, I–V–vi–IV). density = chance of a melody note per eighth. */
export const MOODS: Record<Mood, { bpm: number; root: number; scale: number[]; chords: number[][]; density: number; pulse: boolean }> = {
  calm: { bpm: 72, root: 60, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]], density: 0.38, pulse: false },
  tense: { bpm: 60, root: 57, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 10], [-5, -2, 2, 7]], density: 0.28, pulse: true },
  warm: { bpm: 96, root: 62, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 12], [-5, -1, 2, 7], [-3, 0, 4, 9], [-7, -3, 0, 5]], density: 0.55, pulse: false },
};

export interface Note {
  at: number; // beats from the bar start
  dur: number; // beats
  midi: number;
  voice: "pad" | "bass" | "lead" | "pulse";
}

/** One 4-beat bar. lead = melody position (0..9 over two octaves of the scale), carried from bar to bar. */
export function barNotes(mood: Mood, bar: number, rand: () => number, lead: number): { notes: Note[]; lead: number } {
  const m = MOODS[mood];
  const chord = m.chords[bar % m.chords.length];
  const notes: Note[] = chord.map((c) => ({ at: 0, dur: 4, midi: m.root + c, voice: "pad" as const }));
  notes.push({ at: 0, dur: 1.8, midi: m.root + chord[0] - 24, voice: "bass" }, { at: 2, dur: 1.8, midi: m.root + chord[0] - 24, voice: "bass" });
  if (m.pulse) notes.push({ at: 0, dur: 1, midi: m.root - 24, voice: "pulse" }, { at: 2, dur: 1, midi: m.root - 24, voice: "pulse" });
  for (let eighth = 0; eighth < 8; eighth++) {
    if (rand() >= m.density) continue;
    lead = Math.min(9, Math.max(0, lead + [-2, -1, -1, 1, 1, 2][Math.floor(rand() * 6)]));
    notes.push({ at: eighth / 2, dur: 1.5, midi: m.root + 12 + Math.floor(lead / 5) * 12 + m.scale[lead % 5], voice: "lead" });
  }
  return { notes, lead };
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let ctx: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
let echo: DelayNode;
let noiseBuffer: AudioBuffer;
let enabled = { sfx: true, music: true };
let mood: Mood | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let nextBar = 0;
let bar = 0;
let lead = 4;

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  to?: number; // end frequency
  at?: number; // seconds from now
  when?: number; // absolute AudioContext time
  attack?: number;
  bus?: AudioNode;
}
function tone(freq: number, dur: number, o: ToneOptions = {}) {
  if (!ctx) return;
  const t = o.when ?? ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.1, t + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(o.bus ?? sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}
function noise(dur: number, o: { type?: BiquadFilterType; freq?: number; to?: number; gain?: number; at?: number; attack?: number; q?: number } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + (o.at ?? 0);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = o.type ?? "lowpass";
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.freq ?? 1000, t);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.1, t + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const SFX: Record<Sfx, () => void> = {
  tap: () => tone(740, 0.06, { type: "triangle", gain: 0.05, to: 620 }),
  tick: () => tone(1800, 0.02, { type: "square", gain: 0.02 }),
  pickup: () => {
    tone(523, 0.1, { type: "triangle", gain: 0.08 });
    tone(784, 0.14, { type: "triangle", gain: 0.08, at: 0.07 });
  },
  place: () => {
    tone(160, 0.22, { gain: 0.25, to: 60 });
    noise(0.12, { freq: 500, gain: 0.12 });
  },
  pack: () => {
    tone(420, 0.09, { type: "triangle", gain: 0.09, to: 900 });
    tone(1320, 0.12, { gain: 0.04, at: 0.06 });
  },
  unpack: () => tone(820, 0.12, { type: "triangle", gain: 0.07, to: 380 }),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: "triangle", gain: 0.07, at: i * 0.08 })),
  chime: () => {
    tone(1047, 1.4, { gain: 0.06 });
    tone(1568, 1.2, { gain: 0.04, at: 0.02 });
    tone(2093, 0.9, { gain: 0.02, at: 0.04 });
  },
  whoosh: () => noise(0.7, { type: "bandpass", freq: 300, to: 2400, gain: 0.18, q: 0.8, attack: 0.2 }),
  beep: () => {
    tone(1200, 0.05, { type: "square", gain: 0.025 });
    tone(1600, 0.06, { type: "square", gain: 0.025, at: 0.07 });
  },
  nope: () => tone(320, 0.18, { type: "triangle", gain: 0.08, to: 220 }),
  thud: () => {
    tone(110, 0.6, { gain: 0.4, to: 38 });
    noise(0.5, { freq: 350, gain: 0.3 });
  },
  flare: () => {
    noise(1.6, { type: "highpass", freq: 600, to: 5000, gain: 0.12, attack: 0.5 });
    tone(220, 1.6, { gain: 0.05, to: 880, attack: 0.6 });
  },
  radio: () => {
    [0, 0.12, 0.24].forEach((at) => tone(1320, 0.07, { type: "square", gain: 0.03, at }));
    noise(0.4, { type: "bandpass", freq: 2500, gain: 0.04, at: 0.35 });
  },
  // Radio static for crew and Earth calls (review: calls should sound like a radio).
  crackle: () => {
    noise(0.55, { type: "bandpass", freq: 1800, gain: 0.06, q: 0.6 });
    [0.08, 0.22, 0.4].forEach((at) => noise(0.06, { type: "highpass", freq: 3000, gain: 0.05, at }));
  },
  fanfare: () =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i > 3 ? 0.6 : 0.25, { type: "triangle", gain: 0.08, at: [0, 0.15, 0.3, 0.45, 0.7, 0.85][i] })),
};

export function sfx(name: Sfx) {
  if (ctx && enabled.sfx) SFX[name]();
}

function playNote(n: Note, t: number, beat: number) {
  const dur = n.dur * beat;
  if (n.voice === "pad") {
    // Two slightly detuned voices make a soft chorus.
    for (const detune of [0.997, 1.003]) tone(hz(n.midi) * detune, dur + 1, { when: t, gain: 0.018, attack: 1.2, bus: musicBus });
  } else if (n.voice === "bass") tone(hz(n.midi), dur, { when: t, gain: 0.09, attack: 0.03, bus: musicBus });
  else if (n.voice === "pulse") tone(hz(n.midi), dur, { when: t, gain: 0.07, to: hz(n.midi) * 0.8, attack: 0.02, bus: musicBus });
  else {
    tone(hz(n.midi), dur, { when: t, type: "triangle", gain: 0.045, bus: musicBus });
    tone(hz(n.midi), dur, { when: t, type: "triangle", gain: 0.02, bus: echo });
  }
}
function schedule() {
  if (!ctx || !mood) return;
  const beat = 60 / MOODS[mood].bpm;
  if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.1;
  while (nextBar < ctx.currentTime + 1) {
    const out = barNotes(mood, bar++, Math.random, lead);
    lead = out.lead;
    for (const n of out.notes) playNote(n, nextBar + n.at * beat, beat);
    nextBar += 4 * beat;
  }
}

/** Switches the music at the next bar; null stops it. */
export function setMusic(next: Mood | null) {
  if (next === mood) return;
  mood = next;
  bar = 0;
  clearInterval(timer);
  if (mood && ctx) timer = setInterval(schedule, 250);
}

export function setAudio(next: { sfx: boolean; music: boolean }) {
  enabled = next;
  if (ctx) musicBus.gain.setTargetAtTime(next.music ? 0.55 : 0, ctx.currentTime, 0.3);
}

function unlock() {
  if (ctx) return void ctx.resume();
  ctx = new AudioContext();
  const master = ctx.createDynamicsCompressor();
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = enabled.music ? 0.55 : 0;
  const soft = ctx.createBiquadFilter();
  soft.frequency.value = 2200;
  musicBus.connect(soft).connect(master);
  // A dotted echo on the melody gives the space feel.
  echo = ctx.createDelay();
  echo.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  echo.connect(feedback).connect(echo);
  echo.connect(musicBus);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  if (mood) timer = setInterval(schedule, 250);
}

/** Browsers only allow sound after a tap or key press. Also: a soft tap on every button, and silence in background tabs. */
let listening = false;
export function initAudio() {
  if (listening) return; // StrictMode runs effects twice; one set of listeners only.
  listening = true;
  addEventListener("pointerdown", unlock);
  addEventListener("keydown", unlock);
  document.addEventListener("click", (event) => {
    if ((event.target as Element).closest?.("button:not(:disabled)")) sfx("tap");
  });
  document.addEventListener("visibilitychange", () => {
    if (ctx) void (document.hidden ? ctx.suspend() : ctx.resume());
  });
}
