// "Why?" drawings on the result card: one diagram per shift, drawn from the game's own pieces in the
// same flat style as the "What you know" cards. Shift 3 and 4 draw the player's real outcome (their wall,
// the particles that got in), so the picture explains *this* run, not a generic rule.
import { doseBars, SHELTER_CELL, VENTS, type State, type Wall } from "../game/rules";

const INK = "#2c3a4e";
const CORAL = "#d9472f";
const GOLD = "#f4b23a";
const TEAL = "#23766b";
const PAPER = "#fff6e8";
const CRATE = "#d9a066";
const WOOD = "#a66a34";
const AIR = "#2f86b9";
const FOOD = "#4f9a55";
const SPACE = "#1d2638";
const GROUND = "#d9c3a3";

const T = ({ x, y, children, color = INK, size = 12, anchor = "middle" }: { x: number; y: number; children: React.ReactNode; color?: string; size?: number; anchor?: "start" | "middle" | "end" }) => (
  <text x={x} y={y} fontSize={size} fontWeight={800} fill={color} textAnchor={anchor}>
    {children}
  </text>
);
const Head = ({ id, color }: { id: string; color: string }) => (
  <marker id={id} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
    <path d="M0 0 L10 5 L0 10 z" fill={color} />
  </marker>
);
const Person = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cy={-8} r={7} fill={PAPER} stroke={INK} strokeWidth={2} />
    <rect x={-7} y={0} width={14} height={12} rx={4} fill={PAPER} stroke={INK} strokeWidth={2} />
  </g>
);
const Dome = ({ x, y, w = 70 }: { x: number; y: number; w?: number }) => (
  <g>
    <path d={`M${x} ${y} a${w / 2} ${w / 2.4} 0 0 1 ${w} 0 z`} fill="#f2dfc0" stroke={INK} strokeWidth={2} />
    <rect x={x + w / 2 - 7} y={y - 18} width={14} height={18} rx={2} fill="#3f78b5" stroke={INK} strokeWidth={1.5} />
    <line x1={x + 4} y1={y - 12} x2={x + w - 4} y2={y - 12} stroke="#e2683a" strokeWidth={3} />
  </g>
);

/** Seeded positions so the dots do not jump between renders. */
const dots = (n: number, x: number, y: number, w: number, h: number, seed = 3) => {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => [x + r() * w, y + r() * h]);
};

function Art({ label, box, children }: { label: string; box: string; children: React.ReactNode }) {
  return (
    <svg className="why-art" viewBox={box} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/** S1: habitat ← straight pipe ← fan. Backup air tank stays full. */
function AirArt() {
  return (
    <Art label="The fan pushes air through the straight pipe into the habitat. The backup air tank stays full for an emergency." box="0 0 320 130">
      <defs>
        <Head id="w1" color={AIR} />
      </defs>
      <rect x={0} y={96} width={320} height={34} fill={GROUND} />
      <Dome x={18} y={96} w={84} />
      <rect x={102} y={66} width={120} height={14} rx={6} fill="#c9ccd4" stroke={INK} strokeWidth={1.5} />
      <rect x={146} y={64} width={32} height={18} rx={4} fill={TEAL} stroke={INK} strokeWidth={1.5} />
      <g stroke={AIR} strokeWidth={3} markerEnd="url(#w1)">
        <line x1={214} y1={73} x2={190} y2={73} />
        <line x1={140} y1={73} x2={112} y2={73} />
      </g>
      <rect x={222} y={52} width={46} height={44} rx={5} fill={PAPER} stroke={INK} strokeWidth={2} />
      <circle cx={245} cy={74} r={13} fill="none" stroke={INK} strokeWidth={2} />
      <path d="M245 74 l0 -11 M245 74 l10 6 M245 74 l-10 6" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={284} y={56} width={22} height={40} rx={10} fill="#bfe6fa" stroke={INK} strokeWidth={2} />
      <rect x={288} y={62} width={14} height={30} rx={6} fill={AIR} />
      <T x={60} y={122}>habitat</T>
      <T x={162} y={58} color={TEAL}>fixed joint</T>
      <T x={245} y={122}>fan</T>
      <T x={295} y={122} size={10}>backup</T>
      <T x={295} y={46} size={10} color={AIR}>full</T>
    </Art>
  );
}

/** S2: Moon → Earth radio call; the reply comes back one shift later. */
function RadioArt({ sent }: { sent: boolean }) {
  return (
    <Art label="A radio call to Earth costs 1 power now. Earth's reply comes back in the next shift." box="0 0 320 130">
      <defs>
        <Head id="w2" color={TEAL} />
      </defs>
      <rect x={0} y={0} width={320} height={130} rx={10} fill={SPACE} />
      <circle cx={276} cy={42} r={24} fill="#3f7fd0" />
      <ellipse cx={270} cy={36} rx={10} ry={5} fill="#5ea05a" />
      <rect x={0} y={100} width={150} height={30} fill={GROUND} />
      <path d="M30 100 l14 -30 l14 30 M44 70 l-6 -12 a14 14 0 0 1 22 -10 z" fill="none" stroke={PAPER} strokeWidth={2.5} strokeLinejoin="round" />
      {sent && (
        <>
          <path d="M70 60 Q160 10 246 38" fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray="6 5" markerEnd="url(#w2)" />
          <path d="M248 58 Q170 96 84 80" fill="none" stroke={GOLD} strokeWidth={3} strokeDasharray="6 5" markerEnd="url(#w2)" />
          <T x={150} y={28} color="#9be3d6">your message: now</T>
          <T x={168} y={98} color={GOLD}>reply: next shift</T>
        </>
      )}
      {!sent && <T x={170} y={74} color="#c7d2e4">No call this time: no news from Earth.</T>}
      <T x={276} y={86} color={PAPER}>Earth</T>
      <T x={44} y={122}>radio</T>
    </Art>
  );
}

/** S3: top view of the player's wall. Particles come from every side: a filled square stops them, an empty one lets them reach the crew. */
function WallArt({ wall, need }: { wall: Wall; need: number }) {
  const cell = 30;
  const cx = 160;
  const cy = 62;
  const shield = wall.filter((v, i) => v && i !== SHELTER_CELL).length;
  return (
    <Art label={`Top view of your wall: shield ${shield}, the storm needs ${need}. Particles come from every side; filled squares stop them, empty squares let them in.`} box="0 0 320 130">
      <defs>
        <Head id="w3" color={CORAL} />
      </defs>
      <rect x={0} y={0} width={320} height={130} rx={10} fill="#f4e8d2" />
      {Array.from({ length: 9 }, (_, i) => {
        const dx = (i % 3) - 1;
        const dy = Math.floor(i / 3) - 1;
        if (!dx && !dy) return null;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        const blocked = !!wall[i];
        const from = [cx + ux * 58, cy + uy * 58];
        const to = blocked ? [cx + dx * cell * 1.0 + ux * 16, cy + dy * cell * 1.0 + uy * 16] : [cx + ux * 12, cy + uy * 12];
        return (
          <line key={i} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={CORAL} strokeWidth={blocked ? 2 : 3} opacity={blocked ? 0.55 : 1} markerEnd={blocked ? undefined : "url(#w3)"} />
        );
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const x = cx + ((i % 3) - 1.5) * cell + 1;
        const y = cy + (Math.floor(i / 3) - 1.5) * cell + 1;
        const item = wall[i];
        const mid = i === SHELTER_CELL;
        const vent = VENTS.includes(i);
        const fill = mid ? INK : item ? (item === "tank" ? "#7fb3d9" : CRATE) : vent ? "#cfe6f5" : PAPER;
        return (
          <g key={`c${i}`}>
            <rect x={x} y={y} width={cell - 2} height={cell - 2} rx={4} fill={fill} stroke={item ? WOOD : "#c9b79a"} strokeWidth={1.5} />
            {mid && <Person x={x + cell / 2 - 1} y={y + cell / 2 + 1} s={0.7} />}
          </g>
        );
      })}
      <circle cx={36} cy={30} r={13} fill={GOLD} />
      <T x={36} y={58} size={10}>particles from</T>
      <T x={36} y={70} size={10}>every side</T>
      <T x={270} y={56} color={shield >= need ? TEAL : CORAL}>{`shield ${shield}`}</T>
      <T x={270} y={72} size={10}>{`storm needs ${need}`}</T>
    </Art>
  );
}

/** S4: particles that reached the crew, habitat vs your shelter (scaled to Artemis I, ~4x). */
function DoseArt({ state }: { state: State }) {
  const bars = doseBars(state);
  const n = (pct: number) => Math.round(pct * 0.28);
  return (
    <Art label={`Particles that reached the crew: habitat ${bars.habitat}, ${state.crewMoved ? `your shelter ${bars.yours}` : "your crew stayed in the habitat"}.`} box="0 0 320 130">
      <rect x={0} y={0} width={320} height={130} rx={10} fill="#f4e8d2" />
      <g>
        <rect x={20} y={20} width={120} height={80} rx={8} fill={PAPER} stroke={INK} strokeWidth={2} />
        {dots(n(bars.habitat), 30, 30, 100, 60, 5).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.6} fill={CORAL} />
        ))}
        <Person x={80} y={66} />
        <T x={80} y={118}>{state.crewMoved ? "if they stayed in the habitat" : "your crew: in the habitat"}</T>
      </g>
      <g>
        <rect x={180} y={20} width={120} height={80} rx={8} fill={PAPER} stroke={INK} strokeWidth={2} />
        <rect x={180} y={20} width={120} height={80} rx={8} fill="none" stroke={CRATE} strokeWidth={8} opacity={0.8} />
        {dots(n(state.crewMoved ? bars.yours : bars.full), 192, 30, 96, 60, 9).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.6} fill={CORAL} />
        ))}
        <Person x={240} y={66} />
        <T x={240} y={118}>{state.crewMoved ? "in your shelter" : "a full shelter"}</T>
      </g>
    </Art>
  );
}

/** S5: meals still to eat vs meals in store; food added now counts tonight. */
function FoodArt({ before, after }: { before: State; after: State }) {
  const plates = [after.missed === before.missed, after.food >= 1];
  return (
    <Art label={`Two meals until rescue: tonight ${plates[0] ? "is on the plate" : "is missing"}, and the meal while waiting ${plates[1] ? "is saved" : "is missing"}.`} box="0 0 320 110">
      <rect x={0} y={0} width={320} height={110} rx={10} fill="#f4e8d2" />
      {["tonight", "waiting for rescue"].map((label, i) => {
        const full = plates[i];
        const x = 80 + i * 150;
        return (
          <g key={label}>
            <ellipse cx={x} cy={52} rx={34} ry={20} fill={full ? PAPER : "none"} stroke={full ? INK : CORAL} strokeWidth={2.5} strokeDasharray={full ? undefined : "6 5"} />
            {full && <ellipse cx={x} cy={50} rx={18} ry={9} fill={FOOD} />}
            <T x={x} y={96}>{label}</T>
          </g>
        );
      })}
    </Art>
  );
}

/** S0: each item has one job: use it now, or stand in the wall. */
function CargoArt() {
  return (
    <Art label="Each packed item has one job: use it for its effect, or save it as one square of the shelter wall. Not both." box="0 0 320 120">
      <defs>
        <Head id="w0" color={INK} />
      </defs>
      <rect x={0} y={0} width={320} height={120} rx={10} fill="#f4e8d2" />
      <rect x={128} y={38} width={44} height={40} rx={5} fill={CRATE} stroke={WOOD} strokeWidth={2} />
      <g stroke={INK} strokeWidth={2.5} markerEnd="url(#w0)" fill="none">
        <path d="M128 58 Q90 58 72 40" />
        <path d="M172 58 Q210 58 228 40" />
      </g>
      <path d="M46 20 l-12 22 h10 l-4 18 l16 -24 h-10 l4 -16 z" fill={GOLD} stroke={INK} strokeWidth={1.5} />
      <g stroke={WOOD} strokeWidth={1.5}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={236 + (i % 3) * 18} y={18} width={16} height={16} rx={2} fill={i === 1 ? CRATE : PAPER} />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={236 + (i % 3) * 18} y={36} width={16} height={16} rx={2} fill={PAPER} />
        ))}
      </g>
      <T x={56} y={84}>use it</T>
      <T x={262} y={84}>be a wall</T>
      <T x={150} y={106} color={CORAL}>not both</T>
    </Art>
  );
}

export function WhyArt({ stage, state, before }: { stage: number; state: State; before: State }) {
  switch (stage) {
    case 0:
      return <CargoArt />;
    case 1:
      return <AirArt />;
    case 2:
      return <RadioArt sent={state.forecast !== "none"} />;
    case 3:
      return <WallArt wall={state.wall} need={state.mission.storm.need} />;
    case 4:
      return <DoseArt state={state} />;
    case 5:
      return <FoodArt before={before} after={state} />;
    default:
      return null;
  }
}

/** Debrief: the real event chain of 10 Sep 2017 (NASA DONKI), drawn from the Sun to the Moon. */
export function StormChainArt({ cadet }: { cadet: boolean }) {
  const steps = [
    { x: 46, t: "15:35", kid: "flare", what: "X8.2 flare" },
    { x: 140, t: "16:09", kid: "cloud leaves", what: "CME 2,650 km/s" },
    { x: 238, t: "16:45", kid: "particles arrive", what: "protons >10 MeV" },
  ];
  return (
    <svg className="why-art" viewBox="0 0 320 140" role="img" aria-label="What really happened on 10 September 2017: a flare at 15:35 UTC, a cloud left the Sun at 16:09, particles arrived at 16:45. Source: NASA DONKI.">
      <defs>
        <Head id="wc" color={CORAL} />
      </defs>
      <rect x={0} y={0} width={320} height={140} rx={10} fill={SPACE} />
      <circle cx={46} cy={56} r={24} fill={GOLD} />
      <circle cx={46} cy={56} r={9} fill="#fff1b8" />
      <path d="M86 46 q16 -18 32 -4 q14 -10 26 4 q14 2 10 14 q-6 12 -22 8 q-12 10 -26 0 q-18 2 -20 -22 z" fill="#c9b8e8" opacity={0.85} />
      <g stroke={CORAL} strokeWidth={2.5} strokeDasharray="6 5" markerEnd="url(#wc)">
        <line x1={170} y1={50} x2={258} y2={50} />
        <line x1={170} y1={62} x2={258} y2={66} />
      </g>
      <path d="M262 80 a30 30 0 0 1 56 0 z" fill="#d9d2c4" />
      <circle cx={282} cy={72} r={3} fill="#b9b0a0" />
      <line x1={20} y1={100} x2={300} y2={100} stroke="#6f7c92" strokeWidth={2} />
      {steps.map((s) => (
        <g key={s.t}>
          <circle cx={s.x} cy={100} r={5} fill={GOLD} />
          <T x={s.x} y={118} color={PAPER}>{s.t}</T>
          <T x={s.x} y={132} color="#c7d2e4" size={10}>{cadet ? s.kid : s.what}</T>
        </g>
      ))}
      <T x={300} y={20} color="#c7d2e4" size={10} anchor="end">{cadet ? "NASA's space weather log" : "UTC · NASA DONKI"}</T>
    </svg>
  );
}
