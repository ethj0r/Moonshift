import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  BADGES,
  batteryAvailable,
  branchPath,
  CARGO,
  CARGO_IDS,
  cellName,
  DEBRIEF,
  doseBars,
  earnedBadges,
  ending,
  evaluate,
  foodPackAvailable,
  freePower,
  initialSession,
  lesson,
  MAX_SLOTS,
  MISSION_1,
  PICKUP,
  placeOnWall,
  randomMission,
  removeFromWall,
  sessionReducer,
  SHELTER_CELL,
  shieldOf,
  shieldTier,
  slotsUsed,
  VENTS,
  wallables,
  wallName,
  wallPlacementError,
  type Badge,
  type CargoId,
  type Device,
  type Plan,
  type WallId,
} from "./game/rules";
import { AHA, briefLine, CELL_HINT, clue, crewReaction, DATA_BOOK, dataPanel, extraLines, GLOSSARY, GUESS, hint, SPEAKER, STAGE_TITLE, WHY, type Line } from "./game/content";
import { interactables, nextGoal, type Gesture, type Vec2 } from "./game/world";
import { Dialog } from "./ui/Dialog";
import { angleGap, Dial, Hold, Pots } from "./ui/Gestures";
import { Icon, type IconName } from "./ui/Icons";
import { plain, Rich } from "./ui/Rich";
import { KnowArt } from "./ui/KnowArt";
import { StormChainArt, WhyArt } from "./ui/WhyArt";
import { CineArtPanel, RescueTrack } from "./ui/CineArt";
import { initAudio, setAudio, setMusic, sfx, type Mood } from "./audio";
import { cutscene, type Cine, type CutsceneId } from "./game/cutscenes";
import type { Speaker } from "./game/content";
import VOICE from "./voice.json";

const Scene = lazy(() => import("./scene/Scene"));
type Mode = "cadet" | "specialist";
type Modal = "pause" | "help" | "settings" | "risk" | "restart" | "exit" | "databook" | null;
interface Settings {
  reducedMotion: boolean;
  lowGraphics: boolean;
  voice: boolean;
  sound: boolean;
  music: boolean;
  timer: boolean;
  mode: Mode;
}
interface Progress {
  badges: Badge[];
  newMission: boolean;
}
const TERMS: Partial<Record<number, string[]>> = { 2: ["Contact window"], 3: ["Solar flare", "Particles", "Shield"], 4: ["Dose", "Particles"], 5: ["DONKI"] };
const STORM_DATE: Record<string, string[]> = {
  sep2017: ["", "8 Sep 2017", "6 Sep 2017", "10 Sep 2017", "10–11 Sep 2017", "14 Sep 2017"],
  oct2003: ["", "Oct 2003", "Oct 2003", "28 Oct 2003", "28–29 Oct 2003", "Nov 2003"],
};
const PIPE_START = 135;
const ANTENNA_TARGET = 60;

function load<T>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Preferences stay in memory. */
  }
}
// ElevenLabs clips, one voice per speaker; keyed by the line as read aloud. Lines with live numbers fall back to the browser voice.
const VOICE_CLIPS: Record<string, string> = VOICE;
const voiceKey = (text: string) => plain(text).replace(/\*kshh\*/g, "").replace(/\s+/g, " ").trim();
let clip: HTMLAudioElement | null = null;
function speak(text: string) {
  try {
    clip?.pause();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const file = VOICE_CLIPS[voiceKey(text)];
    if (file) {
      clip = new Audio(`${import.meta.env.BASE_URL}assets/voice/${file}`);
      return void clip.play().catch(() => {});
    }
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(plain(text));
    utterance.rate = 0.9;
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  } catch {
    /* Voice is optional; text is always shown. */
  }
}

const PORTRAIT: Record<Speaker, IconName> = { commander: "crew", technician: "air", researcher: "research", earth: "radio", beep: "star" };
function Portrait({ speaker }: { speaker: Speaker }) {
  return (
    <span className={`portrait p-${speaker}`} aria-hidden="true">
      <Icon name={PORTRAIT[speaker]} size={18} />
    </span>
  );
}
function effectIcon(text: string): IconName {
  const t = text.toLowerCase();
  return /meal|food|harvest|garden/.test(t) ? "food" : /power|battery/.test(t) ? "power" : /wall|shield|shelter|tank/.test(t) ? "shield"
    : /earth|message|radio/.test(t) ? "mail" : /research|sample|plant/.test(t) ? "research" : /air|pipe|joint|vent/.test(t) ? "air" : /crew/.test(t) ? "crew" : "check";
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function App() {
  const [session, dispatch] = useReducer(sessionReducer, MISSION_1, initialSession);
  const [screen, setScreen] = useState<"title" | "game">("title");
  const [modal, setModal] = useState<Modal>(null);
  const [returnToPause, setReturnToPause] = useState(false);
  const [settings, setSettings] = useState<Settings>(() =>
    load("moonshift-preferences", {
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      lowGraphics: false,
      voice: true,
      sound: true,
      music: true,
      timer: false,
      mode: "cadet" as Mode,
    }),
  );
  const [progress, setProgress] = useState<Progress>(() => load("moonshift-progress", { badges: [], newMission: false }));
  const [ready, setReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [sceneError, setSceneError] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [walk, setWalk] = useState<{ at: Vec2; id: string | null; nonce: number } | null>(null);
  const [carrying, setCarrying] = useState<WallId | null>(null);
  const [tankVertical, setTankVertical] = useState(false);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [pipeAngle, setPipeAngle] = useState(PIPE_START);
  const [antenna, setAntenna] = useState(200);
  const [goggles, setGoggles] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [guessed, setGuessed] = useState<string | null>(null);
  // Guess = choose, read what it means, then confirm. peek: the option under the mouse or keyboard focus.
  const [choice, setChoice] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [briefStep, setBriefStep] = useState(0);
  const [intro, setIntro] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const [debriefPage, setDebriefPage] = useState(0);
  const [cargoStart, setCargoStart] = useState(0);
  const [fastCargo, setFastCargo] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [placesOpen, setPlacesOpen] = useState(false);
  const [missionInfo, setMissionInfo] = useState<string | null>(null);
  const [cine, setCine] = useState<Cine | null>(null);
  // First-play tour of the HUD: spotlight each meter once, with one short line.
  const [tour, setTour] = useState<number | null>(null);
  const tourDone = useRef(false);
  const seenOpening = useRef(false);
  const [lastChoice, setLastChoice] = useState<string | null>(null);
  const [yaw, setYaw] = useState(0);
  const [trayNudge, setTrayNudge] = useState(0);
  const drag = useRef<number | null>(null);
  const turnView = (dir: 1 | -1) => setYaw((y) => y + (dir * Math.PI) / 4);
  const lastActivity = useRef(Date.now());
  const dialogInvoker = useRef<HTMLElement | null>(null);
  const { state, plan, phase } = session;
  const stage = state.stage;
  const cadet = settings.mode === "cadet";
  const preview = useMemo(() => evaluate(state, plan), [state, plan]);
  const things = useMemo(() => interactables(state, plan, carrying), [state, plan, carrying]);
  const focused = things.find((item) => item.id === focusId) ?? null;
  const playing = screen === "game" && phase === "play" && stage <= 5 && !modal && ready && !sceneError && !cine;
  const controlsLocked = !playing || !!gesture;
  // Visual guidance (route + pointer): always for Cadet, after the first hint for Specialist.
  const goal = playing && !gesture && (cadet || hintLevel >= 1) ? nextGoal(state, plan, carrying, things, !!preview.errors.length || !!carrying, tankVertical) : null;
  // Decision clue: for the object B.E.E.P. stands at, or the last choice made (it stays to explain it).
  const clueCard = playing && !gesture && !placesOpen ? clue(state, plan, focusId ?? lastChoice ?? "") : null;
  const pointAt = (ui: "run" | "moveCrew" | "act") =>
    !goal ? "" : (ui === "act" ? !goal.choice && !!focusId && goal.targets.includes(focusId) : goal.ui === ui) ? "guide-me" : "";

  useEffect(() => save("moonshift-preferences", settings), [settings]);
  useEffect(() => save("moonshift-progress", progress), [progress]);

  // Say a line: show the bubble and, in Cadet mode, read it aloud.
  function say(line: Line, voice = cadet && settings.voice) {
    setBubble(line);
    if (line.speaker === "beep") sfx("beep");
    else if (line.speaker === "earth" || line.text.startsWith("*kshh*")) sfx("crackle");
    if (voice) speak(line.text.replace(/\*kshh\*/g, ""));
  }
  function update(next: Plan) {
    if (!playing) return;
    dispatch({ type: "plan", plan: next });
    lastActivity.current = Date.now();
    setHintLevel(0);
  }

  // New stage → camera intro, brief bubble, reset per-stage UI.
  useEffect(() => {
    if (screen !== "game") return;
    setCarrying(null);
    setGesture(null);
    setGoggles(false);
    setGuessed(null);
    setChoice(null);
    setBriefStep(0);
    setHintLevel(0);
    setShowWhy(false);
    setPipeAngle(PIPE_START);
    setAntenna(200);
    setDebriefPage(0);
    setLastChoice(null);
    setIntro(true);
    lastActivity.current = Date.now();
    if (stage <= 5) say(briefLine(state));
    if (stage === 0) setCargoStart(0);
    const scene: CutsceneId | null =
      stage === 0 && !seenOpening.current ? "opening" : stage === 3 ? "flare" : stage === 4 ? "storm" : stage === PICKUP ? "rescue" : null;
    if (scene === "opening") seenOpening.current = true;
    setCine(scene ? { id: scene, shots: cutscene(scene, state), shot: 0, start: performance.now() } : null);
    const t = setTimeout(() => setIntro(false), settings.reducedMotion ? 0 : 1600);
    return () => clearTimeout(t);
  }, [stage, screen, session.state.mission]);

  useEffect(initAudio, []);
  useEffect(() => setAudio({ sfx: settings.sound, music: settings.music }), [settings.sound, settings.music]);
  const mood: Mood = screen === "title" ? "calm" : stage >= PICKUP ? "warm" : stage === 3 || stage === 4 ? "tense" : "calm";
  useEffect(() => setMusic(mood), [mood]);
  // One sound per change the player caused, read from state so every input path (tap, E, Walk to…, Do it for me) is covered.
  const before = useRef({ plan, carrying, phase, stage });
  useEffect(() => {
    const was = before.current;
    before.current = { plan, carrying, phase, stage };
    if (phase !== was.phase) return void (phase === "running" ? sfx("whoosh") : phase === "result" && sfx("chime"));
    if (stage !== was.stage) return;
    if (carrying !== was.carrying) return sfx(carrying ? "pickup" : "place");
    if (plan.power.includes("radio") && !was.plan.power.includes("radio")) return sfx("radio");
    if ((plan.pipeFixed && !was.plan.pipeFixed) || (plan.openFood && !was.plan.openFood) || plan.power.length > was.plan.power.length) return sfx("success");
    if (plan.cargo.length !== was.plan.cargo.length) sfx(plan.cargo.length > was.plan.cargo.length ? "pack" : "unpack");
  }, [plan, carrying, phase, stage]);

  // Cutscene: one timer per shot; Cadet hears each caption.
  useEffect(() => {
    if (!cine || !ready || modal) return;
    const shot = cine.shots[cine.shot];
    if (cadet && settings.voice) speak(shot.caption);
    if (shot.shake) sfx("thud");
    if (shot.key === "beep" && cine.id === "opening") sfx("beep");
    if (shot.key === "jump") sfx("whoosh");
    if (shot.key === "meal") sfx("unpack");
    if (shot.key === "pad") sfx("chime");
    if (shot.flash) sfx("flare");
    if (cine.id === "rescue" && cine.shot === 0) sfx(ending(state) === "safe" ? "fanfare" : "chime");
    const t = setTimeout(
      () => setCine((c) => (c && c.shot + 1 < c.shots.length ? { ...c, shot: c.shot + 1, start: performance.now() } : null)),
      cine.shots[cine.shot].ms,
    );
    return () => clearTimeout(t);
  }, [cine?.id, cine?.shot, ready, modal]);
  useEffect(() => {
    if (tourDone.current || stage !== 1 || phase !== "play" || cine || modal || !ready || intro) return;
    tourDone.current = true;
    setTour(0);
  }, [stage, phase, cine, modal, ready, intro]);
  function skipCine() {
    setCine(null);
    try {
      speechSynthesis.cancel();
    } catch {
      /* no voice */
    }
  }

  // Resolve animation, then the result card.
  useEffect(() => {
    if (phase !== "running" || modal) return;
    const t = setTimeout(() => dispatch({ type: "result" }), settings.reducedMotion ? 50 : stage === 4 ? 2600 : 1400);
    return () => clearTimeout(t);
  }, [phase, modal, settings.reducedMotion, stage]);

  // Hint ladder (Interaksi §7): 0 world signs always; 1 crew speaks; 2 scan highlights.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setNow(Date.now());
      const idle = (Date.now() - lastActivity.current) / 1000;
      const [l1, l2] = cadet ? [15, 30] : [25, 45];
      if (hintLevel < 1 && idle > l1) raiseHint(1);
      else if (hintLevel < 2 && idle > l2) raiseHint(2);
    }, 1000);
    return () => clearInterval(id);
  }, [playing, hintLevel, cadet, stage]);
  function raiseHint(level: 1 | 2) {
    setHintLevel(level);
    say(hint(state, level));
    if (level === 2) {
      setScanning(true);
      setTimeout(() => setScanning(false), 4000);
    }
  }
  useEffect(() => {
    const active = () => (lastActivity.current = Date.now());
    window.addEventListener("pointerdown", active);
    window.addEventListener("keydown", active);
    return () => {
      window.removeEventListener("pointerdown", active);
      window.removeEventListener("keydown", active);
    };
  }, []);

  // Cargo timer (optional, Settings): Lightning badge.
  useEffect(() => {
    if (stage === 0 && phase === "play" && settings.timer && !cargoStart) setCargoStart(Date.now());
  }, [stage, phase, settings.timer, cargoStart]);
  const cargoLeft = settings.timer && cargoStart ? Math.max(0, 60 - Math.floor((now - cargoStart) / 1000)) : null;

  // Keyboard: E acts, Space scans (hold), G goggles, R turns the tank, Escape pauses.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (el.closest("input, textarea, select, [data-own-keys]") || document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      const onButton = !!el.closest("button");
      if (cine) {
        if (key === "escape") skipCine();
        return;
      }
      if (key === "escape") {
        if (gesture) setGesture(null);
        else if (screen === "game") setModal("pause");
        return;
      }
      if (!playing || gesture) return;
      if (key === "e" || (key === "enter" && !onButton)) {
        event.preventDefault();
        if (focused) act(focused.id);
      } else if (key === " " && !onButton) {
        event.preventDefault();
        setScanning(true);
      } else if (key === "g" && stage >= 3) setGoggles((v) => !v);
      else if (key === "r" && carrying === "tank") setTankVertical((v) => !v);
      else if (key === "q") turnView(-1);
      else if (key === "z") turnView(1);
    };
    const up = (event: KeyboardEvent) => event.key === " " && setScanning(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  function addPower(device: Device, next: Plan = plan) {
    if (next.power.includes(device)) return update({ ...next, power: next.power.filter((d) => d !== device) });
    if (next.power.length + 1 > freePower(state, next)) {
      say({ speaker: "beep", text: "No free power. Turn something off, or plug in a battery." });
      return;
    }
    update({ ...next, power: [...next.power, device] });
  }
  function toggleBattery(kind: "cargo" | "workshop") {
    const next = { ...plan, battery: plan.battery === kind ? ("none" as const) : kind };
    if (stage === 3) next.wall = removeFromWall(next.wall, kind === "cargo" ? "battery" : "workshopBattery");
    if (next.battery === "none" && next.power.length > freePower(state, next)) next.power = next.power.slice(0, freePower(state, next));
    update(next);
  }

  /** The single action button (E or tap an object). */
  function act(id: string) {
    if (!playing) return;
    const item = things.find((thing) => thing.id === id);
    if (!item) return;
    lastActivity.current = Date.now();
    setLastChoice(id);
    if (item.gesture) {
      setGesture(item.gesture);
      return;
    }
    const [kind, arg] = id.split(":");
    switch (kind) {
      case "cargo": {
        const cargo = arg as CargoId;
        if (slotsUsed([...plan.cargo, cargo]) > MAX_SLOTS) {
          say({ speaker: "beep", text: "Too heavy. Put something back first." });
          return;
        }
        update({ ...plan, cargo: [...plan.cargo, cargo] });
        return;
      }
      case "spare":
        return update({ ...plan, installSpare: !plan.installSpare });
      case "door":
        return update({
          ...plan,
          workshop: arg as "keep" | "dismantle",
          battery: arg === "keep" && plan.battery === "workshop" ? "none" : plan.battery,
        });
      case "garden":
      case "radio":
        if (item.info) return say({ speaker: "beep", text: item.label });
        return addPower(kind);
      case "lamp":
        return addPower("lamp");
      case "battery":
        return toggleBattery("cargo");
      case "workshopBattery":
        return toggleBattery("workshop");
      case "foodpack":
        return update({ ...plan, openFood: !plan.openFood });
      case "shelter":
        update({ ...plan, moveCrew: !plan.moveCrew });
        if (!plan.moveCrew) say({ speaker: "commander", text: "Everyone, to the shelter. One, two, three!" });
        return;
      case "pick": {
        const wid = arg as WallId;
        setCarrying(wid);
        setTankVertical(plan.wall.filter((v) => v === "tank").length === 2 && plan.wall.indexOf("tank") + 3 === plan.wall.lastIndexOf("tank"));
        update({ ...plan, wall: removeFromWall(plan.wall, wid) });
        return;
      }
      case "cell":
        return placeCarried(Number(arg));
      case "putback":
        setCarrying(null);
        return;
      case "tank":
        return say({ speaker: "technician", text: "Too heavy to move in time. Earth's warning would help." });
    }
  }
  function placeCarried(cell: number) {
    if (!carrying) return;
    const problem = wallPlacementError(state, plan, carrying, cell, tankVertical);
    if (problem) return say({ speaker: "beep", text: problem });
    update(placeOnWall(state, plan, carrying, cell, tankVertical));
    setCarrying(null);
  }
  /** Tap an object → B.E.E.P. walks there and uses it; tap ground → walk there. */
  function pick(id: string) {
    if (!playing) return;
    if (id.startsWith("ground:")) {
      const [x, z] = id.slice(7).split(",").map(Number);
      setWalk({ at: [x, z], id: null, nonce: Date.now() });
      return;
    }
    const item = things.find((thing) => thing.id === id);
    if (item) setWalk({ at: item.at, id, nonce: Date.now() });
  }

  function run() {
    if (!playing) return;
    if (carrying) return say({ speaker: "beep", text: "Put down what B.E.E.P. is carrying first." });
    if (preview.errors.length) return say({ speaker: "beep", text: preview.errors[0] });
    // Review: no warning before a risky plan; the child sees the consequence instead (no game over).
    commit(true);
  }
  function commit(acceptRisk: boolean) {
    if (stage === 0 && settings.timer && cargoStart && Date.now() - cargoStart <= 60000) setFastCargo(true);
    dispatch({ type: "commit", acceptRisk });
    setGoggles(false);
    setModal(null);
  }
  function next() {
    setShowWhy(false);
    dispatch({ type: "continue" });
  }
  // Save badges and unlock Misi Baru when the debrief opens.
  useEffect(() => {
    if (stage !== DEBRIEF) return;
    const won = earnedBadges(state, fastCargo);
    setProgress((p) => ({
      badges: [...new Set([...p.badges, ...won])],
      newMission: p.newMission || ending(state) === "safe",
    }));
  }, [stage]);

  function startGame(mission = MISSION_1) {
    dispatch({ type: "restart", mission });
    setFastCargo(false);
    setScreen("game");
    setModal(null);
  }
  function closeModal() {
    setModal(returnToPause && (modal === "help" || modal === "settings") ? "pause" : null);
    setReturnToPause(false);
  }

  const guess = GUESS[stage];
  const guessHint = (label: string | null) =>
    !label || !guess
      ? ""
      : stage === 3
        ? CELL_HINT[VENTS.some((cell) => cellName(cell) === label) ? "vent" : "empty"]
        : (guess.options.find((option) => option.label === label)?.hint ?? "");
  const guessProps = (label: string) => ({
    "aria-pressed": choice === label,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") setPeek(label);
    },
    onPointerLeave: () => setPeek(null),
    onFocus: () => setPeek(label),
    onBlur: () => setPeek(null),
    onClick: () => {
      setChoice(label);
      if (cadet && settings.voice) speak(guessHint(label));
    },
  });
  const shownGuess = peek ?? choice;
  const lines = [briefLine(state), ...extraLines(state)];
  const panel = dataPanel(state);
  const date = STORM_DATE[state.mission.storm.key]?.[stage] ?? "";
  const shieldNow = stage === 3 ? shieldOf(plan.wall) : state.shield;
  const need = state.mission.storm.need;
  const airUnits = stage === 4 && plan.moveCrew && state.spareInstalled ? 1 : 2;
  const mealsNeeded = stage >= 1 && stage <= 5 ? 6 - stage : 0;
  // Meals still to eat this run (this shift .. pickup) vs meals the crew will have with this plan.
  const mealsToEat = mealsNeeded + 1;
  const mealsHave = preview.next.missed > state.missed ? 0 : preview.next.food + 1;
  const batteryKind = batteryAvailable(state, plan, "cargo") ? "cargo" : batteryAvailable(state, plan, "workshop") ? "workshop" : null;
  const titleMenu = screen === "title";

  const meter = (
    <div className="meters" aria-label="Three meters">
      <div className="meter power" aria-label={`Power: ${preview.power.used} of ${preview.power.free} free units used, ${airUnits} for air`}>
        <span className="meter-name">
          <Icon name="power" size={16} /> Power
        </span>
        <span className="cells">
          {Array.from({ length: airUnits }, (_, i) => (
            <span key={`a${i}`} className="cell air" title="Air">
              <Icon name="lock" size={11} />
            </span>
          ))}
          {Array.from({ length: Math.max(preview.power.free, preview.power.used) }, (_, i) => (
            <span key={i} className={`cell ${i < preview.power.used ? "used" : "free"} ${i >= preview.power.free ? "over" : ""}`} />
          ))}
        </span>
        <small>{cadet ? "New power each shift" : `${airUnits} air · ${preview.power.free} free · new each shift`}</small>
        {batteryKind && stage >= 1 && stage <= 5 && phase === "play" && (
          <button className="chip" disabled={!playing} aria-pressed={plan.battery !== "none"} onClick={() => toggleBattery(batteryKind)}>
            {plan.battery !== "none" ? "Unplug battery" : "+1 battery"}
          </button>
        )}
      </div>
      <div className="meter food" aria-label={`Food: ${mealsHave} meals for ${mealsToEat} still to eat`}>
        <span className="meter-name">
          <Icon name="food" size={16} /> Food
        </span>
        <span className="plates" title={`${mealsHave} meals · ${mealsToEat} still to eat`}>
          {Array.from({ length: Math.max(mealsToEat, mealsHave) }, (_, i) => (
            <span key={i} className={`plate ${i < mealsHave ? "full" : "missing"}`} />
          ))}
        </span>
        {!cadet && stage >= 1 && stage <= 5 && (
          <small>
            {state.food} → {preview.next.food} · need {mealsNeeded - 1} more after this
          </small>
        )}
        {foodPackAvailable(state) && stage >= 1 && stage <= 5 && phase === "play" && (
          <button className="chip" disabled={!playing} aria-pressed={plan.openFood} onClick={() => (plan.openFood ? update({ ...plan, openFood: false }) : setGesture("foodpack"))}>
            {plan.openFood ? "Close food pack" : "Open food pack"}
          </button>
        )}
      </div>
      <div className="meter shield" aria-label={`Shield: ${shieldNow} of 8, storm needs ${need}`}>
        <span className="meter-name">
          <Icon name="shield" size={16} /> Shield
        </span>
        <span className="segments">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`seg ${i < shieldNow ? "on" : ""} ${i === need - 1 ? "need" : ""}`} />
          ))}
        </span>
        <small>
          {shieldTier(shieldNow)}
          {!cadet && ` · ${shieldNow}/8 · storm needs ${need}`}
        </small>
      </div>
    </div>
  );

  return (
    <main
      className={`app stage-${stage} ${cine && !titleMenu ? "cine-on" : ""} ${titleMenu ? "menu-mode" : "game-mode"} ${settings.reducedMotion ? "reduced-motion" : ""} ${goggles ? "goggles-on" : ""}`}
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest("dialog")) dialogInvoker.current = target.closest("button");
      }}
    >
      <div
        className="scene-region"
        aria-label="Lunar outpost, third-person view"
        // Right-drag orbits the camera (left click still walks/uses).
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.button === 2) drag.current = event.clientX;
        }}
        onPointerMove={(event) => {
          if (drag.current === null) return;
          const dx = event.clientX - drag.current;
          drag.current = event.clientX;
          setYaw((y) => y - dx * 0.008);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <SceneBoundary
          key={sceneGeneration}
          onError={() => {
            setSceneError(true);
            setReady(false);
          }}
        >
          <Suspense fallback={null}>
            <Scene
              mode={titleMenu ? "menu" : "play"}
              state={state}
              plan={plan}
              phase={phase}
              interactables={playing ? things : []}
              carrying={carrying}
              walk={walk}
              controlsLocked={controlsLocked}
              gesture={gesture}
              pipeAngle={pipeAngle}
              goggles={goggles}
              scanning={scanning}
              intro={intro}
              cine={titleMenu ? null : cine}
              guide={goal?.targets ?? []}
              guideChoice={!!goal?.choice}
              yaw={yaw}
              paused={!!modal}
              lowGraphics={settings.lowGraphics}
              reducedMotion={settings.reducedMotion}
              zoom={1}
              onFocus={setFocusId}
              onArrive={(id) => id && act(id)}
              onPick={pick}
              onReady={() => setReady(true)}
              onProgress={setLoadProgress}
              onError={() => {
                setSceneError(true);
                setReady(false);
              }}
            />
          </Suspense>
        </SceneBoundary>
      </div>

      {titleMenu && <div className="title-shade" aria-hidden="true" />}
      {titleMenu ? (
        <section className="title-menu" aria-label="Main menu">
          <div className="mission-patch">
            <Icon name="crew" size={23} />
            <span>LUNAR SOUTH POLE OUTPOST</span>
          </div>
          <h1>MOONSHIFT</h1>
          <p className="title-subtitle">Help B.E.E.P. the robot keep three astronauts safe.</p>
          <p className="title-description">You are B.E.E.P. A real solar storm from NASA data is coming. You have five shifts.</p>
          <p className="fiction-note">
            <Icon name="research" size={15} /> Made-up story, real science: the outpost and crew are invented; the storm and its numbers are real NASA data.
          </p>
          <div className="mode-cards" role="radiogroup" aria-label="Pilot card">
            {(["cadet", "specialist"] as const).map((mode) => (
              <button
                key={mode}
                role="radio"
                aria-checked={settings.mode === mode}
                className={`mode-card ${settings.mode === mode ? "selected" : ""}`}
                onClick={() => setSettings({ ...settings, mode })}
              >
                <Icon name={mode === "cadet" ? "crew" : "research"} size={26} />
                <strong>{mode === "cadet" ? "Cadet" : "Specialist"}</strong>
                <span>{mode === "cadet" ? "Ages 7–9 · pictures, short words, read aloud" : "Ages 10–12 · real NASA numbers and units"}</span>
              </button>
            ))}
          </div>
          <nav className="main-menu-buttons" aria-label="Start menu">
            <button className="button primary menu-button" disabled={!ready || sceneError} onClick={() => startGame()}>
              Mission 1 <Icon name="arrow" size={21} />
            </button>
            {progress.newMission && (
              <button className="button menu-button" disabled={!ready || sceneError} onClick={() => startGame(randomMission())}>
                New mission · random storm
              </button>
            )}
            <button className="button menu-button" onClick={() => setModal("help")}>
              How to play
            </button>
            <button className="button menu-button" onClick={() => setModal("settings")}>
              Settings
            </button>
          </nav>
          {progress.badges.length > 0 && (
            <p className="badge-row">
              {progress.badges.map((b) => (
                <span key={b} className="badge">
                  <Icon name="star" size={14} /> {BADGES[b].name}
                </span>
              ))}
            </p>
          )}
          <p className="prototype-note">No account. No timer unless you want one.</p>
        </section>
      ) : (
        <>
          <header className="hud">
            <div className="hud-left">
              <div className="shift-chip">
                <strong>{stage === 0 ? "OPENING" : stage <= 5 ? `SHIFT ${stage} OF 5` : stage === PICKUP ? "RESCUE" : "DEBRIEF"}</strong>
                <span>{STAGE_TITLE[stage]}</span>
                {date && stage <= 5 && <small>{date} · time sped up</small>}
              </div>
              {stage <= 5 && (
                <div className="goal-track" data-tour="rescue">
                  <span className="meter-name">Rescue lander</span>
                  <RescueTrack stage={stage} />
                </div>
              )}
              {stage >= 1 && stage <= 5 && meter}
            </div>
            <div className="hud-right">
              {stage <= 5 && (
                <div className="contact" aria-label={`Contact window open in shifts ${state.mission.windows.join(" and ")}`}>
                  <span className="meter-name">
                    <Icon name="radio" size={16} /> {cadet ? "Earth can hear us" : "Contact window"}
                  </span>
                  <span className="dots">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} title={`Shift ${s}`} className={`dot ${state.mission.windows.includes(s) ? "open" : ""} ${s === stage ? "now" : ""}`}>
                        {state.mission.windows.includes(s) && <Icon name="radio" size={11} />}
                        {s}
                      </span>
                    ))}
                  </span>
                  {(state.forecast !== "none" || plan.power.includes("radio")) && (
                    <span className={`envelope ${state.forecast === "arrived" ? "arrived" : ""}`}>
                      <Icon name="mail" size={15} />
                      {state.forecast === "arrived" ? "Reply from Earth arrived" : "1 message: reply next shift"}
                    </span>
                  )}
                </div>
              )}
              <button className="icon-button pause-button" aria-label="Pause game" onClick={() => setModal("pause")}>
                <Icon name="pause" />
              </button>
            </div>
          </header>

          {bubble && stage <= 5 && phase === "play" && !gesture && (
            <div className={`bubble speaker-${bubble.speaker}`} role="status" aria-live="polite">
              <Portrait speaker={bubble.speaker} />
              <strong>{SPEAKER[bubble.speaker]}:</strong>{" "}
              <span>
                <Rich text={bubble.text} />
              </span>
              <button className="icon-button small" aria-label="Read aloud" onClick={() => speak(bubble.text)}>
                <Icon name="speaker" size={16} />
              </button>
            </div>
          )}

          {panel && stage <= 5 && (
            <button className="data-panel" onClick={() => setModal("databook")} aria-label={cadet ? `Real NASA data: ${panel.kid}. Where is this from?` : `Data: ${panel.what}, ${panel.when}, ${panel.source}, archive. Where is this from?`}
            >
              <span className="archive">{cadet ? "REAL NASA DATA" : "ARCHIVE"}</span>
              <strong>{cadet ? panel.kid : panel.what}</strong>
              {!cadet && (
                <span>
                  {panel.when} · {panel.source}
                </span>
              )}
              <small>{cadet ? "From the past, not live" : "Real NASA data, not live"}</small>
            </button>
          )}

          {stage === 0 && phase === "play" && (
            <div className="backpack panel" aria-label="Backpack">
              <span className="meter-name">
                <Icon name="cargo" size={16} /> Backpack {slotsUsed(plan.cargo)}/{MAX_SLOTS}
                {cargoLeft !== null && <span className="timer">{cargoLeft}s</span>}
              </span>
              <div className="needs" aria-label="What the outpost needs">
                <span className="need kw-s">
                  <Icon name="cargo" size={15} /> Crates <b>{state.mission.supplies}</b>
                  <small>at the outpost</small>
                </span>
                <span className="need kw-f">
                  <Icon name="food" size={15} /> Meals <b>{state.food}</b>
                  <small>the crew eats 6</small>
                </span>
                <span className="need kw-p">
                  <Icon name="power" size={15} /> Power <b>1</b>
                  <small>free each shift</small>
                </span>
              </div>
              <div className="slots">
                {plan.cargo.flatMap((id) =>
                  Array.from({ length: CARGO[id].slots }, (_, i) => (
                    <button key={`${id}${i}`} className={`slot ${id}`} disabled={!playing} onClick={() => update({ ...plan, cargo: plan.cargo.filter((c) => c !== id) })} aria-label={`Put back ${CARGO[id].name}`}>
                      {i === 0 ? CARGO[id].name : "↔"}
                    </button>
                  )),
                )}
                {Array.from({ length: Math.max(0, MAX_SLOTS - slotsUsed(plan.cargo)) }, (_, i) => (
                  <span key={i} className="slot empty" />
                ))}
              </div>
              <small>Walk to an item and press E, or tap it. Tap a slot to put it back.</small>
            </div>
          )}

          {stage === 3 && phase === "play" && (
            <aside className="shelter-map panel" aria-label="Shelter map" data-own-keys>
              <span className="meter-name">
                <Icon name="shield" size={16} /> Shelter wall {carrying ? `· carrying ${wallName(carrying).toLowerCase()}` : ""}
              </span>
              <div className="grid">
                {plan.wall.map((value, cell) => (
                  <button
                    key={cell}
                    disabled={!playing || cell === SHELTER_CELL}
                    className={`${cell === SHELTER_CELL ? "core" : ""} ${VENTS.includes(cell) ? "vent" : ""} ${value ? `filled ${value.startsWith("supply") ? "supply" : value}` : ""} ${
                      carrying && cell !== SHELTER_CELL ? (wallPlacementError(state, plan, carrying, cell, tankVertical) ? "cannot" : "can") : ""
                    }`}
                    aria-label={`${cellName(cell)}: ${cell === SHELTER_CELL ? "shelter" : value ? wallName(value) : VENTS.includes(cell) ? "open vent" : "empty"}`}
                    onClick={() => {
                      if (carrying) placeCarried(cell);
                      else if (value) act(`pick:${value}`);
                      else {
                        // Tapped a square first: point at the shelf instead of doing nothing.
                        setTrayNudge(Date.now());
                        sfx("nope");
                        say({ speaker: "beep", text: "First pick something from the **shelf** below." });
                      }
                    }}
                  >
                    {cell === SHELTER_CELL ? "Crew" : value ? wallName(value).split(" ")[0] : VENTS.includes(cell) ? "≋" : cellName(cell)}
                  </button>
                ))}
              </div>
              <div key={trayNudge} className={`tray ${trayNudge ? "nudge" : ""}`}>
                {wallables(state, plan)
                  .filter((id) => !plan.wall.includes(id) && id !== carrying)
                  .map((id) => (
                    <button key={id} className="chip" disabled={!playing || !!carrying} onClick={() => act(`pick:${id}`)}>
                      {wallName(id)}
                    </button>
                  ))}
                {carrying && (
                  <>
                    {carrying === "tank" && (
                      <button className="chip" onClick={() => setTankVertical((v) => !v)}>
                        Turn tank (R) · {tankVertical ? "up-down" : "side"}
                      </button>
                    )}
                    <button className="chip" onClick={() => setCarrying(null)}>
                      Put back
                    </button>
                  </>
                )}
              </div>
              <small>
                {carrying
                  ? "Green squares fit. Tap one."
                  : state.spareInstalled
                    ? "Spare joint installed: vents may close."
                    : "Keep one ≋ vent open so the crew can breathe."}
              </small>
            </aside>
          )}

          {stage === 4 && (phase === "running" || phase === "result") && <DoseBars state={state} cadet={cadet} animate={!settings.reducedMotion} />}

          {phase === "play" && stage <= 5 && (
            <footer className="action-bar">
              <div className="aux">
                <button className="button" disabled={!playing} onClick={() => raiseHint(hintLevel >= 1 ? 2 : 1)}>
                  <Icon name="help" size={19} /> Ask crew
                </button>
                {!cadet && <button className="button" disabled={!playing} aria-pressed={scanning} onPointerDown={() => setScanning(true)} onPointerUp={() => setScanning(false)} onPointerLeave={() => setScanning(false)} onClick={() => setScanning((v) => !v)}>
                  <Icon name="eye" size={19} /> Scan
                </button>}
                {(stage === 3 || stage === 4) && (
                  <button className={`button ${goggles ? "is-selected" : ""}`} disabled={!playing} aria-pressed={goggles} onClick={() => setGoggles((v) => !v)}>
                    <Icon name="shield" size={19} /> Particle goggles
                  </button>
                )}
                <span className="view-turn" role="group" aria-label="Turn the view">
                  <button className="icon-button" disabled={!playing} aria-label="Turn view left (Q)" title="Turn view left (Q)" onClick={() => turnView(-1)}>
                    <Icon name="rotate" size={19} />
                  </button>
                  <button className="icon-button flip" disabled={!playing} aria-label="Turn view right (Z)" title="Turn view right (Z)" onClick={() => turnView(1)}>
                    <Icon name="rotate" size={19} />
                  </button>
                </span>
                <div className="places">
                  <button className="button" disabled={!playing} aria-expanded={placesOpen} onClick={() => setPlacesOpen((v) => !v)}>
                    Walk to…
                  </button>
                  {placesOpen && playing && (
                    <ul className="places-list panel">
                      {things.map((item) => (
                        <li key={item.id}>
                          <button
                            className="text-button"
                            onClick={() => {
                              setPlacesOpen(false);
                              pick(item.id);
                            }}
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {stage === 4 && (
                <button className={`button move-crew ${plan.moveCrew ? "is-selected" : "pulse"} ${pointAt("moveCrew")}`} disabled={!playing} aria-pressed={plan.moveCrew} onClick={() => act("shelter")}>
                  <Icon name="crew" /> {plan.moveCrew ? "Crew in shelter ✓" : "Move crew"}
                </button>
              )}
              <button
                className={`button action-button ${focused && !focused.info && !focused.undo ? "ready" : ""} ${focused?.undo ? "undo" : ""} ${pointAt("act")}`}
                disabled={!playing || !focused}
                onClick={() => focused && act(focused.id)}
              >
                <kbd>E</kbd> {focused?.undo && <Icon name="rotate" size={16} />} {focused ? focused.label : "Walk to something with a ring"}
              </button>
              <div className="run">
                <small className={preview.errors.length ? "blocked" : preview.risks.length ? "risky" : "ok"}>
                  {carrying ? "Put down what you carry." : preview.errors[0] ?? preview.risks[0] ?? "Plan looks good."}
                </small>
                <button className={`button ${stage === 0 && slotsUsed(plan.cargo) < MAX_SLOTS ? "" : "primary"} run-button ${pointAt("run")}`} disabled={!playing || !!preview.errors.length || !!carrying} onClick={run}>
                  {stage === 0 ? "Back to the outpost" : "Run shift"} <Icon name="arrow" />
                </button>
              </div>
            </footer>
          )}
        </>
      )}

      {clueCard && (
        <aside className="clue panel" aria-label="Clue" aria-live="polite">
          <strong className="clue-title">{clueCard.title}</strong>
          <div className={`clue-sides ${clueCard.b ? "two" : ""}`}>
            {[clueCard.a, clueCard.b].map(
              (side, i) =>
                side && (
                  <div key={i} className={`clue-side side-${side.icon}`}>
                    <span className="clue-label">
                      <Icon name={side.icon} size={16} /> {side.label}
                    </span>
                    <span>
                      <Rich text={side.text} />
                    </span>
                  </div>
                ),
            )}
            {clueCard.b && <span className="clue-or">or</span>}
          </div>
          <p className="clue-think">
            <Icon name="help" size={16} />
            <span>
              <Rich text={clueCard.think} />
            </span>
          </p>
        </aside>
      )}

      {/* Brief: crew speaks, then one picture guess (never graded). */}
      {screen === "game" && phase === "brief" && !modal && ready && !intro && !cine && (
        <section className="brief panel" aria-label="Shift brief">
          <span className="result-tag">{stage === 0 ? "OPENING" : `SHIFT ${stage}`} · {STAGE_TITLE[stage]}</span>
          {stage === 0 && briefStep < lines.length && (
            <div className="mission-card" aria-label="Mission card">
              {[
                { key: "supply", icon: "cargo" as IconName, title: `${state.mission.supplies} supply crate${state.mission.supplies > 1 ? "s" : ""}`, text: `*kshh* B.E.E.P., we have ${state.mission.supplies} crate${state.mission.supplies > 1 ? "s" : ""} of spare parts here. *kshh*` },
                { key: "base", icon: "crew" as IconName, title: "Habitat, garden, workshop", text: "*kshh* Air in the habitat, a small garden, a workshop and a radio. That's our outpost. *kshh*" },
                { key: "storm", icon: "warning" as IconName, title: "The Sun", text: "*kshh* The Sun might get stormy. Keep an ear on the radio. *kshh*" },
              ].map((card) => (
                <button
                  key={card.key}
                  className={`mission-icon ${missionInfo === card.key ? "selected" : ""}`}
                  onClick={() => {
                    setMissionInfo(card.key);
                    say({ speaker: "commander", text: card.text });
                    if (!card.text.startsWith("*kshh*")) sfx("crackle");
                  }}
                >
                  <Icon name={card.icon} size={28} />
                  <strong>{card.title}</strong>
                </button>
              ))}
            </div>
          )}
          {briefStep < lines.length ? (
            <>
              <p className="brief-line">
                <Portrait speaker={lines[briefStep].speaker} />
                <strong>{SPEAKER[lines[briefStep].speaker]}:</strong>
                <span className="line-text">
                  <Rich text={lines[briefStep].text} />
                </span>
                <button className="icon-button small" aria-label="Read aloud" onClick={() => speak(lines[briefStep].text)}>
                  <Icon name="speaker" size={16} />
                </button>
              </p>
              <button
                className="button primary"
                autoFocus
                onClick={() => {
                  const n = briefStep + 1;
                  setBriefStep(n);
                  if (n < lines.length) say(lines[n]);
                  else if (guess && cadet && settings.voice) speak(`${guess.know} ${guess.question}`);
                }}
              >
                Next <Icon name="arrow" />
              </button>
            </>
          ) : guessed === null && guess ? (
            <>
              {/* Scaffolding: the facts first, so the guess is a reasoned step and not a coin flip. */}
              <div className="guess-know">
                <span className="know-tag">
                  <Icon name="star" size={14} /> What you know
                </span>
                <p className="know-line">
                  <Rich text={guess.know} />
                </p>
                <KnowArt stage={stage} />
                <button className="icon-button small know-say" aria-label="Read aloud" onClick={() => speak(`${guess.know} ${guess.question}`)}>
                  <Icon name="speaker" size={16} />
                </button>
              </div>
              <p className="brief-line guess-q">{guess.question}</p>
              {stage === 3 ? (
                <div className="grid guess-grid">
                  {Array.from({ length: 9 }, (_, cell) =>
                    cell === SHELTER_CELL ? (
                      <button key={cell} disabled className="core">
                        Crew
                      </button>
                    ) : (
                      <button key={cell} className={`${VENTS.includes(cell) ? "vent" : ""} ${choice === cellName(cell) ? "picked" : ""}`} {...guessProps(cellName(cell))}>
                        {cellName(cell)}
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <div className="guess-options">
                  {guess.options.map((option) => (
                    <button key={option.label} className={`button ${choice === option.label ? "picked" : ""}`} {...guessProps(option.label)}>
                      <Icon name={option.icon} /> {option.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="guess-hint" aria-live="polite">
                {shownGuess ? (
                  <span className="line-text">
                    <strong>{shownGuess}: </strong>
                    <Rich text={guessHint(shownGuess)} />
                  </span>
                ) : (
                  "Any answer is fine. Tap one to see what it means."
                )}
              </p>
              <button className="button primary" disabled={!choice} onClick={() => setGuessed(choice)}>
                That's my guess <Icon name="check" />
              </button>
            </>
          ) : (
            <>
              {guessed && (
                <p className="brief-line">
                  You guessed <strong>{guessed}</strong>. {stage === 3 ? "Put on the Particle goggles to check!" : "Let's find out."}
                </p>
              )}
              <button
                className="button primary"
                autoFocus
                onClick={() => {
                  dispatch({ type: "begin" });
                  say(briefLine(state), false);
                  if (stage === 3 && guessed) setGoggles(true);
                }}
              >
                {stage === 0 ? "Open the cargo bay" : "Let's go"} <Icon name="arrow" />
              </button>
              <p className="hint">Walk with WASD or arrows, or tap the ground. Press E or tap a ringed object to use it.</p>
            </>
          )}
        </section>
      )}

      {/* Hand gestures (Interaksi §6: close camera, ≤ 8 s, skippable in Cadet). */}
      {gesture && playing && (
        <section className="gesture panel" aria-label="Hands-on">
          {gesture === "pipe" && (
            <>
              <h2>Turn the pipe joint</h2>
              <p>Turn it until both ends line up.</p>
              <Dial
                value={pipeAngle}
                target={0}
                goal="pipe"
                label="Pipe joint"
                onChange={(v) => {
                  setPipeAngle(v);
                  if (angleGap(v, 0) < 8)
                    setTimeout(() => {
                      update({ ...plan, pipeFixed: true });
                      setGesture(null);
                      say({ speaker: "beep", text: "Bip! Air is flowing." });
                    }, 350);
                }}
              />
            </>
          )}
          {gesture === "antenna" && (
            <>
              <h2>Point the antenna at Earth</h2>
              <p>{plan.power.length + 1 > freePower(state, plan) ? "No free power! Turn something off first." : "Turn the dish until Earth lights up, then send."}</p>
              <Dial value={antenna} target={ANTENNA_TARGET} goal="earth" label="Antenna dish" onChange={setAntenna} />
              <button
                className="button primary"
                disabled={angleGap(antenna, ANTENNA_TARGET) >= 8 || plan.power.length + 1 > freePower(state, plan)}
                onClick={() => {
                  addPower("radio");
                  setGesture(null);
                  say({ speaker: "beep", text: stage === 5 ? "Research data on its way." : "Message sent. Reply: next shift." });
                }}
              >
                <Icon name="mail" /> Send · 1 power
              </button>
            </>
          )}
          {gesture === "workshop" && (
            <>
              <h2>The workshop</h2>
              <p>Keep it for science, or take it apart for a battery.</p>
              <div className="choice-row">
                <button
                  className={`button ${plan.workshop === "keep" ? "primary" : ""}`}
                  aria-pressed={plan.workshop === "keep"}
                  onClick={() => {
                    update({ ...plan, workshop: "keep", battery: plan.battery === "workshop" ? "none" : plan.battery });
                    setGesture(null);
                  }}
                >
                  <Icon name="research" /> Keep it
                  <small>Sample lamp for the research plants</small>
                </button>
                <button
                  className={`button ${plan.workshop === "dismantle" ? "primary" : ""}`}
                  aria-pressed={plan.workshop === "dismantle"}
                  onClick={() => {
                    update({ ...plan, workshop: "dismantle" });
                    setGesture(null);
                  }}
                >
                  <Icon name="power" /> Take it apart
                  <small>Workshop battery: +1 power, or a wall cell</small>
                </button>
              </div>
            </>
          )}
          {gesture === "harvest" && (
            <>
              <h2>Harvest the garden</h2>
              <p>Tap each pot. Uses 1 power for the lights.</p>
              <Pots
                onDone={() => {
                  addPower("garden");
                  setGesture(null);
                }}
              />
            </>
          )}
          {gesture === "foodpack" && (
            <>
              <h2>Open the food pack</h2>
              <p>Hold to pull the ribbon. Once open, it can't be a wall.</p>
              <Hold
                label="Hold to open"
                reducedMotion={settings.reducedMotion}
                onDone={() => {
                  update({ ...plan, openFood: true });
                  setGesture(null);
                }}
              />
            </>
          )}
          <div className="gesture-actions">
            <button className="text-button" onClick={() => setGesture(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {tour !== null && screen === "game" && !cine && !modal && (
        <HudTour
          step={tour}
          shift={stage}
          onNext={() => setTour((t) => (t !== null && t + 1 < TOUR.length ? t + 1 : null))}
          onSkip={() => setTour(null)}
        />
      )}

      {cine && screen === "game" && ready && !modal && (
        <section className="cine" aria-label="Cutscene" aria-live="polite">
          <div className="bar top" />
          {cine.shots[cine.shot].flash && !settings.reducedMotion && <div key={cine.shot} className="cine-flash" />}
          {cine.id === "opening" && cine.shots[cine.shot].key === "base" && (
            <h2 className="cine-title">
              MOONSHIFT <small>{state.mission.storm.label} storm · real NASA data</small>
            </h2>
          )}
          {cine.shots[cine.shot].art && (
            <div key={`art${cine.shot}`} className="cine-art-wrap">
              <CineArtPanel kind={cine.shots[cine.shot].art!} cadet={cadet} />
            </div>
          )}
          <div className="bar bottom">
            <div key={`${cine.id}${cine.shot}`} className="cine-text">
              <p className="cine-caption">
                <Rich text={cine.shots[cine.shot].caption} />
              </p>
            </div>
            <span className="cine-dots" aria-hidden="true">
              {cine.shots.map((_, i) => (
                <span key={i} className={i === cine.shot ? "on" : ""} />
              ))}
            </span>
            <button className="text-button cine-skip" autoFocus onClick={skipCine}>
              Skip scene <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      )}

      {!ready && !sceneError && (
        <div className="loading-badge" role="status">
          <span className="loading-dot" />
          Getting the outpost ready… {Math.round(loadProgress * 100)}%
        </div>
      )}
      {sceneError && (
        <section className="scene-error panel" role="alert">
          <h2>The outpost needs a moment.</h2>
          <p>3D could not start. Check that WebGL 2 is available, then try again.</p>
          <button
            className="button primary"
            onClick={() => {
              setSceneError(false);
              setReady(false);
              setSceneGeneration((value) => value + 1);
            }}
          >
            Retry 3D
          </button>
          <button className="text-button" onClick={() => setScreen("title")}>
            Return to title
          </button>
        </section>
      )}
      {screen === "game" && phase === "running" && !modal && (
        <div className="resolving-panel panel" role="status">
          <Icon name={stage === 4 ? "crew" : "check"} size={30} />
          <p>{stage === 4 ? "The storm passes over the outpost…" : "B.E.E.P. is on it."}</p>
          <button className="text-button" onClick={() => dispatch({ type: "result" })}>
            Skip
          </button>
        </div>
      )}

      {/* Result card: one cause-effect sentence + "Why?" (Interaksi §5 step 6). */}
      {screen === "game" && phase === "result" && !modal && !cine && session.last && (
        <Dialog
          returnFocus={dialogInvoker.current}
          title={stage === PICKUP ? (ending(state) === "safe" ? "Safe and Sound!" : "Rescue at Last") : stage === 0 ? "Your cargo is in." : `Shift ${stage} done.`}
          onClose={next}
        >
          {stage !== PICKUP && <WhyArt stage={session.last.stage} state={state} before={session.last.before} />}
          <BeforeAfter before={session.last.before} after={state} />
          <ul className="result-list">
            {session.last.effects.filter((effect) => effect !== "The crew ate one meal.").map((effect) => (
              <li key={effect} className={`fx-${effectIcon(effect)}`}>
                <Icon name={effectIcon(effect)} size={18} />
                <span>
                  <Rich text={effect} />
                </span>
              </li>
            ))}
          </ul>
          {stage === PICKUP ? (
            <p className="crew-quote">{ending(state) === "safe" ? "“You built us a wall and kept us fed. We're going home.”" : "“The rescue lander is here. Let's see what to try next.”"}</p>
          ) : (
            <>
              {(() => {
                const r = crewReaction(session.last.before, state);
                return (
                  r && (
                    <p className="crew-quote">
                      <Portrait speaker={r.speaker} /> <strong>{SPEAKER[r.speaker]}:</strong>
                      <span className="line-text">
                        <Rich text={r.text} />
                      </span>
                    </p>
                  )
                );
              })()}
            </>
          )}
          {WHY[session.last.stage] && stage !== PICKUP && (
            <>
              <button className="text-button" aria-expanded={showWhy} onClick={() => setShowWhy((v) => !v)}>
                <Icon name="help" size={16} /> Why?
              </button>
              {showWhy && (
                <p className="why">
                  {AHA[session.last.stage] && (
                    <>
                      <Rich text={AHA[session.last.stage]!} />{" "}
                    </>
                  )}
                  <Rich text={cadet ? WHY[session.last.stage]!.cadet : WHY[session.last.stage]!.specialist} />
                </p>
              )}
            </>
          )}
          {TERMS[session.last.stage] && (
            <p className="terms">
              {TERMS[session.last.stage]!.map((t) => (
                <button key={t} className="chip" onClick={() => setTerm(term === t ? null : t)}>
                  {t} ?
                </button>
              ))}
              {term && GLOSSARY[term] && <span className="term-def">{GLOSSARY[term]}</span>}
            </p>
          )}
          <button className="button primary" autoFocus onClick={next}>
            {stage === PICKUP ? "Debrief" : stage === 5 ? "Wait for the rescue lander" : `Start shift ${stage + 1}`} <Icon name="arrow" />
          </button>
        </Dialog>
      )}

      {screen === "game" && stage === DEBRIEF && !modal && (
        <Debrief
          page={debriefPage}
          setPage={setDebriefPage}
          state={state}
          cadet={cadet}
          fast={fastCargo}
          known={progress.badges}
          canNewMission={progress.newMission || ending(state) === "safe"}
          onReplay={() => dispatch({ type: "replay" })}
          onNewMission={() => startGame(randomMission())}
          onFinish={() => setScreen("title")}
          onDataBook={() => setModal("databook")}
        />
      )}

      {modal && (
        <Dialog
          returnFocus={dialogInvoker.current}
          wide={modal === "databook"}
          title={
            modal === "pause"
              ? "A moment to think."
              : modal === "help"
                ? "How to play"
                : modal === "settings"
                  ? "Settings"
                  : modal === "risk"
                    ? "Hmm, will this be enough?"
                    : modal === "databook"
                      ? "Where do these numbers come from?"
                      : modal === "restart"
                        ? "Start Mission again?"
                        : "Return to the title?"
          }
          onClose={closeModal}
        >
          {modal === "pause" && (
            <div className="modal-menu">
              <button className="button primary" onClick={() => setModal(null)}>
                Resume
              </button>
              <button
                className="button"
                onClick={() => {
                  setReturnToPause(true);
                  setModal("help");
                }}
              >
                How to play
              </button>
              <button
                className="button"
                onClick={() => {
                  setReturnToPause(true);
                  setModal("settings");
                }}
              >
                Settings
              </button>
              <button
                className="button"
                onClick={() => {
                  setModal(null);
                  setCine({ id: "opening", shots: cutscene("opening", state), shot: 0, start: performance.now() });
                }}
              >
                Watch the intro again
              </button>
              <button className="text-button" onClick={() => setModal("restart")}>
                Restart mission
              </button>
              <button className="text-button" onClick={() => setModal("exit")}>
                Return to title
              </button>
            </div>
          )}
          {modal === "help" && (
            <>
              <div className="help-row">
                <Icon name="crew" size={30} />
                <div>
                  <h3>Walk and use</h3>
                  <p>WASD, arrows, or tap the ground to walk. Amber rings can be used: press E or tap them.</p>
                </div>
              </div>
              <div className="help-row">
                <Icon name="shield" size={30} />
                <div>
                  <h3>Three meters</h3>
                  <p>Power runs things. Food feeds the crew. Shield is how many cells around the shelter are covered.</p>
                </div>
              </div>
              <div className="help-row">
                <Icon name="cargo" size={30} />
                <div>
                  <h3>One big choice</h3>
                  <p>Every item is used now, or saved as a wall. Not both.</p>
                </div>
              </div>
              <div className="help-row">
                <Icon name="power" size={30} />
                <div>
                  <h3>Power</h3>
                  <p>Every shift brings 3 new power. The air always uses 2, so 1 is free. The radio, the garden and the sample lamp each use 1. A battery adds 1 for one shift. Power you don't use is not saved.</p>
                </div>
              </div>
              <div className="help-row">
                <Icon name="food" size={30} />
                <div>
                  <h3>Food</h3>
                  <p>The crew eats 1 meal every shift and 1 more while waiting for rescue.</p>
                </div>
              </div>
              <h3>The items</h3>
              <ul className="help-items">
                {CARGO_IDS.map((id) => (
                  <li key={id}>
                    <b>
                      <strong>{CARGO[id].name}</strong> · {CARGO[id].slots} slot{CARGO[id].slots > 1 ? "s" : ""}
                    </b>
                    <span>Use: {CARGO[id].use}</span>
                    <span>{CARGO[id].wall}</span>
                  </li>
                ))}
                <li>
                  <b>
                    <strong>Supply crate</strong> · already at the outpost
                  </b>
                  <span>Spare parts. Its only job: one wall cell.</span>
                </li>
              </ul>
              <p className="hint">Space or Scan shows labels. G toggles Particle goggles. R turns the water tank. Escape pauses.</p>
              <button className="button primary" onClick={closeModal}>
                Got it
              </button>
            </>
          )}
          {modal === "settings" && (
            <>
              <label className="setting-row">
                <span>
                  <strong>Specialist mode</strong>
                  <small>Show numbers and longer “Why?” answers.</small>
                </span>
                <input type="checkbox" checked={settings.mode === "specialist"} onChange={(e) => setSettings({ ...settings, mode: e.target.checked ? "specialist" : "cadet" })} />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Read lines aloud</strong>
                  <small>Cadet mode speaks crew lines automatically.</small>
                </span>
                <input type="checkbox" checked={settings.voice} onChange={(e) => setSettings({ ...settings, voice: e.target.checked })} />
              </label>
              <label className="setting-row">
                <span>
                  <strong>60-second cargo timer</strong>
                  <small>Optional challenge. Earns the Lightning badge.</small>
                </span>
                <input type="checkbox" checked={settings.timer} onChange={(e) => setSettings({ ...settings, timer: e.target.checked })} />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Sound effects</strong>
                  <small>Clicks, thuds and chimes.</small>
                </span>
                <input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ ...settings, sound: e.target.checked })} />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Music</strong>
                  <small>Calm tunes; softer and slower during the storm.</small>
                </span>
                <input type="checkbox" checked={settings.music} onChange={(e) => setSettings({ ...settings, music: e.target.checked })} />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Reduce motion</strong>
                  <small>No particle snow, instant camera.</small>
                </span>
                <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })} />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Low graphics</strong>
                  <small>Lower resolution and simpler glass.</small>
                </span>
                <input type="checkbox" checked={settings.lowGraphics} onChange={(e) => setSettings({ ...settings, lowGraphics: e.target.checked })} />
              </label>
              <button className="button primary" onClick={closeModal}>
                Done
              </button>
            </>
          )}
          {modal === "risk" && (
            <>
              <div className="risk-message">
                <Icon name="warning" />
                {preview.risks.join(" ")}
              </div>
              <p>You can go back and change the plan, or keep going. The rescue lander comes either way.</p>
              <button className="button primary" autoFocus onClick={() => setModal(null)}>
                Change my plan
              </button>
              <button className="text-button" onClick={() => commit(true)}>
                Keep going
              </button>
            </>
          )}
          {modal === "databook" && (
            <>
              <p className="fiction-note in-panel">The outpost, the crew and B.E.E.P. are made up. The storm, its numbers and the science come from real NASA data.</p>
              <ul className="data-book">
                {DATA_BOOK.map((entry) => (
                  <li key={entry.name}>
                    <strong>{entry.name}</strong>
                    <span>{entry.text}</span>
                    <small>Used for: {entry.used}</small>
                    <a href={entry.url} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  </li>
                ))}
              </ul>
              <p className="hint">All storm data is archive data, replayed faster. Nothing here is live.</p>
              <button className="button primary" onClick={closeModal}>
                Close
              </button>
            </>
          )}
          {(modal === "restart" || modal === "exit") && (
            <>
              <p>This run ends. You can always start again.</p>
              <button className="button primary" autoFocus onClick={() => setModal("pause")}>
                Keep playing
              </button>
              <button
                className="text-button"
                onClick={() => {
                  if (modal === "restart") startGame(state.mission);
                  else {
                    setScreen("title");
                    setModal(null);
                  }
                }}
              >
                {modal === "restart" ? "Restart mission" : "Return to title"}
              </button>
            </>
          )}
        </Dialog>
      )}
    </main>
  );
}

/** Two (S4) or three (debrief) dose bars: comparison only until real CRaTER/OSDR numbers are added. */
type Snapshot = Parameters<typeof doseBars>[0];
/** Visual before -> after for what changed this shift. */
function BeforeAfter({ before, after }: { before: Snapshot; after: Snapshot }) {
  const rows: { icon: IconName; label: string; from: string | number; to: string | number; kind: string }[] = [];
  if (before.stage >= 1 && before.food !== after.food) rows.push({ icon: "food", label: "Meals", from: before.food, to: after.food, kind: "f" });
  if (before.shield !== after.shield) rows.push({ icon: "shield", label: "Shield", from: before.shield, to: after.shield, kind: "s" });
  if (before.forecast === "none" && after.forecast === "sent") rows.push({ icon: "mail", label: "Earth's reply", from: "none", to: "next shift", kind: "e" });
  if (!before.crewMoved && after.crewMoved) rows.push({ icon: "crew", label: "Crew", from: "outside", to: "shelter", kind: "s" });
  if (!rows.length) return null;
  return (
    <div className="before-after" aria-label="What changed">
      {rows.map((r) => (
        <span key={r.label} className={`ba kw-${r.kind}`}>
          <Icon name={r.icon} size={18} />
          <small>{r.label}</small>
          <b>{r.from}</b>
          <Icon name="arrow" size={14} />
          <b>{r.to}</b>
        </span>
      ))}
    </div>
  );
}

function DoseBars({ state, cadet, animate, full = false }: { state: Parameters<typeof doseBars>[0]; cadet: boolean; animate: boolean; full?: boolean }) {
  const bars = doseBars(state);
  const rows = [
    state.crewMoved
      ? { key: "habitat", label: "If they stayed in the habitat", value: bars.habitat }
      : { key: "yours", label: "Your crew (stayed in the habitat)", value: bars.yours },
    ...(state.crewMoved ? [{ key: "yours", label: "In your shelter", value: bars.yours }] : []),
    ...(full || !state.crewMoved ? [{ key: "full", label: "Shelter with the thickest wall", value: bars.full }] : []),
  ];
  return (
    <div className={`dose panel ${animate ? "grow" : ""}`} aria-label="Particle dose comparison">
      <span className="meter-name">Particles that reached the crew</span>
      {rows.map((row) => (
        <div key={row.key} className={`dose-row ${row.key}`}>
          <span>{row.label}</span>
          <span className="bar" style={{ ["--w" as string]: `${row.value}%` }} />
          {!cadet && <small>{row.value}%</small>}
        </div>
      ))}
      <small className="hint">
        {cadet
          ? "Shorter bar = fewer particles = safer. In NASA's Artemis I test, the best-protected spot got about 4 times less."
          : "Scaled to NASA Artemis I (MARE): Orion's best-shielded spot got about 4× less than its least shielded spot, so the thickest wall here lets in 1/4. A comparison, not a measured dose."}
      </small>
    </div>
  );
}

/** The HUD tour: what each panel is for, pointed at, one short line each. */
const TOUR: { sel: string; text: (shift: number) => string }[] = [
  { sel: '[data-tour="rescue"]', text: (s) => `**Rescue lander**: it comes after shift 5. Now it's shift ${s}.` },
  { sel: ".meter.power", text: () => "**Power**: 3 new every shift. The air uses 2, so **1** is yours to share." },
  { sel: ".meter.food", text: () => "**Food**: each circle is **1 meal**. The crew eats 1 every shift." },
  { sel: ".meter.shield", text: () => "**Shield**: how thick the storm wall is. You'll build it in **shift 3**." },
];
function HudTour({ step, shift, onNext, onSkip }: { step: number; shift: number; onNext: () => void; onSkip: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const measure = () => setRect(document.querySelector(TOUR[step].sel)?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);
  const last = step === TOUR.length - 1;
  const pad = 6;
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="What the panels show">
      {rect && <div className="tour-hole" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />}
      <div className="tour-tip panel" style={rect ? { left: rect.right + 18, top: Math.max(12, rect.top - 4) } : { left: 24, top: 120 }}>
        <span className="tour-arrow" aria-hidden="true" />
        <p>
          <Rich text={TOUR[step].text(shift)} />
        </p>
        <div className="tour-actions">
          <button className="text-button" onClick={onSkip}>
            Skip tour
          </button>
          <button className="button primary" autoFocus onClick={onNext}>
            {last ? "Got it" : `Next ${step + 1}/${TOUR.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Debrief(props: {
  page: number;
  setPage: (n: number) => void;
  state: Parameters<typeof doseBars>[0];
  cadet: boolean;
  fast: boolean;
  known: Badge[];
  canNewMission: boolean;
  onReplay: () => void;
  onNewMission: () => void;
  onFinish: () => void;
  onDataBook: () => void;
}) {
  const { state } = props;
  const l = lesson(state);
  const badges = earnedBadges(state, props.fast);
  const titles = ["Particle dose", "One thing we learned", "Your path"];
  const nextBadge = (["scientist", "crew", "strong"] as Badge[]).find((b) => !badges.includes(b));
  return (
    <Dialog title={titles[props.page]} wide onClose={props.onFinish}>
      <span className="result-tag">
        DEBRIEF {props.page + 1}/3 · {ending(state) === "safe" ? "SAFE AND SOUND" : "RESCUE AT LAST"}
      </span>
      {props.page === 0 && (
        <>
          <DoseBars state={state} cadet={props.cadet} animate={false} full />
          {state.mission.storm.key === "sep2017" && <StormChainArt cadet={props.cadet} />}
          <p className="fiction-note in-panel">This mission was a story. The storm really happened on {state.mission.storm.label === "September 2017" ? "10 September 2017" : `${state.mission.storm.label}`}.</p>
        </>
      )}
      {props.page === 1 && (
        <>
          <p className="lesson">
            <Rich text={l.text} />
          </p>
          <button className="text-button" onClick={props.onDataBook}>
            <Icon name="help" size={16} /> Why? Where is this from?
          </button>
        </>
      )}
      {props.page === 2 && (
        <>
          <ol className="branch-map" aria-label="Your path">
            {branchPath(state).map((node) => (
              <li key={node.label} className={node.ok ? "ok" : "miss"}>
                {node.ok ? <Icon name="check" size={14} /> : "?"} {node.label}
              </li>
            ))}
          </ol>
          <p className="tip">
            <Rich text={l.tip} />
          </p>
          {nextBadge && (
            <p className="next-badge">
              <Icon name="star" size={16} />
              <span>
                Next badge to try: <strong>{BADGES[nextBadge].name}</strong>. {BADGES[nextBadge].how}
              </span>
            </p>
          )}
          <div className="badge-row">
            {(Object.keys(BADGES) as Badge[]).map((b) => (
              <span key={b} className={`badge ${badges.includes(b) ? "earned" : "locked"}`} title={BADGES[b].how}>
                <Icon name={badges.includes(b) ? "star" : "lock"} size={14} /> {BADGES[b].name}
                {badges.includes(b) && !props.known.includes(b) && <em> new!</em>}
              </span>
            ))}
          </div>
        </>
      )}
      {props.page < 2 ? (
        <button className="button primary" autoFocus onClick={() => props.setPage(props.page + 1)}>
          Next <Icon name="arrow" />
        </button>
      ) : (
        <div className="debrief-actions">
          <button className="button primary" autoFocus onClick={props.onReplay}>
            Replay from shift 1 <Icon name="rotate" />
          </button>
          {props.canNewMission && (
            <button className="button" onClick={props.onNewMission}>
              New mission · random storm
            </button>
          )}
          <button className="text-button" onClick={props.onFinish}>
            Finish
          </button>
        </div>
      )}
    </Dialog>
  );
}
