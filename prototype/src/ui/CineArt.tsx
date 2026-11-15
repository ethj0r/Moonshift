// Drawings shown over the prologue when an idea can't be filmed: a slow orbit, the shift track,
// and the three beats of one shift. The rescue track is the same component the HUD uses, so a new
// player recognises it later ("that's the thing from the intro").
import type { CineArt } from "../game/cutscenes";
import { RESCUE_SHIFT } from "../game/cutscenes";

const INK = "#2c3a4e";
const GOLD = "#ffc23d";
const PAPER = "#fff6e8";
const DIM = "#5b6478";
const FOOD = "#4f9a55";

/** A small lander glyph (body, window, legs). */
const LanderGlyph = ({ x, y, s = 1, color = PAPER }: { x: number; y: number; s?: number; color?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-7 4 L-10 11 M7 4 L10 11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <path d="M-8 4 Q-8 -9 0 -11 Q8 -9 8 4 Z" fill={color} stroke={INK} strokeWidth={1.5} />
    <circle cy={-4} r={2.6} fill="#3f78b5" />
  </g>
);

/**
 * Shifts 1..5 and the rescue lander after the last one. Past shifts filled, the current one ringed.
 * `animate` lights them one by one (used in the prologue).
 */
export function RescueTrack({ stage, animate = false, dark = false }: { stage: number; animate?: boolean; dark?: boolean }) {
  const line = dark ? "#8b95aa" : "#c9b79a";
  const text = dark ? PAPER : INK;
  return (
    <svg
      className={`rescue-track ${animate ? "animate" : ""}`}
      viewBox="0 0 220 44"
      role="img"
      aria-label={stage >= 1 && stage <= RESCUE_SHIFT ? `Shift ${stage} of ${RESCUE_SHIFT}. The rescue lander comes after shift ${RESCUE_SHIFT}.` : `The rescue lander comes after shift ${RESCUE_SHIFT}.`}
    >
      <line x1={14} y1={18} x2={196} y2={18} stroke={line} strokeWidth={3} strokeDasharray="2 5" />
      {Array.from({ length: RESCUE_SHIFT }, (_, i) => {
        const s = i + 1;
        const x = 14 + i * 36;
        const done = s < stage;
        const now = s === stage;
        return (
          <g key={s} className="pip" style={{ animationDelay: `${0.5 + i * 0.55}s` }}>
            <circle cx={x} cy={18} r={now ? 11 : 9} fill={done || animate ? GOLD : dark ? "#1d2638" : PAPER} stroke={now ? INK : line} strokeWidth={now ? 3 : 2} />
            <text x={x} y={22} fontSize={11} fontWeight={800} fill={done || animate ? INK : text} textAnchor="middle">
              {s}
            </text>
          </g>
        );
      })}
      <g className="pip goal" style={{ animationDelay: `${0.5 + RESCUE_SHIFT * 0.55}s` }}>
        <LanderGlyph x={200} y={16} s={1.15} color={animate ? GOLD : dark ? PAPER : "#e2683a"} />
      </g>
      <text x={14} y={41} fontSize={10} fontWeight={700} fill={text}>
        shifts
      </text>
      <text x={206} y={41} fontSize={10} fontWeight={700} fill={text} textAnchor="end">
        rescue
      </text>
    </svg>
  );
}

function OrbitArt({ cadet }: { cadet: boolean }) {
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label="The rescue lander circles the Moon on a long, slow orbit. One lap takes about a week.">
      <ellipse cx={120} cy={66} rx={40} ry={62} fill="none" stroke="#9fd0ff" strokeWidth={2} strokeDasharray="5 5" />
      <circle cx={120} cy={104} r={26} fill="#d9d2c4" />
      <circle cx={112} cy={98} r={4} fill="#c2b9a8" />
      <circle cx={128} cy={110} r={3} fill="#c2b9a8" />
      <circle cx={120} cy={130} r={4} fill="#e2683a" stroke={PAPER} strokeWidth={1.5} />
      <text x={136} y={142} fontSize={10} fontWeight={700} fill={PAPER}>
        you are here
      </text>
      <g>
        <LanderGlyph x={0} y={0} s={0.9} color={GOLD} />
        <animateMotion dur="6s" repeatCount="indefinite" path="M120 4 A40 62 0 1 1 119.9 4" />
      </g>
      <text x={8} y={18} fontSize={12} fontWeight={800} fill={PAPER}>
        {cadet ? "1 lap ≈ 1 week" : "≈ 6.5 days per lap"}
      </text>
      <text x={8} y={34} fontSize={10} fontWeight={700} fill="#c7d2e4">
        too slow to come back sooner
      </text>
    </svg>
  );
}

/** One shift = plan jobs → Run shift (time jumps) → the crew eats 1 meal → next shift. */
function ShiftCycleArt({ step }: { step: 0 | 1 | 2 }) {
  const nodes = [
    { x: 40, label: "jobs" },
    { x: 120, label: "Run shift" },
    { x: 200, label: "1 meal" },
  ];
  const on = (i: number) => (i === step ? GOLD : DIM);
  return (
    <svg viewBox="0 0 240 120" role="img" aria-label={`One shift: plan the jobs, press Run shift and time jumps ahead, then the crew eats one meal. Now: ${nodes[step].label}.`}>
      <defs>
        <marker id="cyc" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#8b95aa" />
        </marker>
      </defs>
      <path d="M64 44 H94" stroke="#8b95aa" strokeWidth={2.5} markerEnd="url(#cyc)" />
      <path d="M144 44 H174" stroke="#8b95aa" strokeWidth={2.5} markerEnd="url(#cyc)" />
      <path d="M222 60 Q234 102 120 102 Q6 102 15 62" fill="none" stroke="#8b95aa" strokeWidth={2} strokeDasharray="4 4" markerEnd="url(#cyc)" />
      <text x={120} y={116} fontSize={10} fontWeight={700} fill="#c7d2e4" textAnchor="middle">
        next shift
      </text>
      {nodes.map((n, i) => (
        <g key={n.label} opacity={i === step ? 1 : 0.55}>
          <circle cx={n.x} cy={44} r={i === step ? 24 : 20} fill="#1d2638" stroke={on(i)} strokeWidth={i === step ? 4 : 2} />
          {i === 0 && (
            <g transform={`translate(${n.x} 44)`}>
              <rect x={-9} y={-10} width={18} height={14} rx={3} fill={PAPER} />
              <circle cx={-4} cy={-3} r={2} fill={INK} />
              <circle cx={4} cy={-3} r={2} fill={INK} />
              <rect x={-10} y={5} width={20} height={6} rx={2} fill="#e2683a" />
            </g>
          )}
          {i === 1 && <path d={`M${n.x - 11} 34 l10 10 l-10 10 z M${n.x} 34 l10 10 l-10 10 z`} fill={on(1) === GOLD ? GOLD : PAPER} />}
          {i === 2 && (
            <g transform={`translate(${n.x} 44)`}>
              <ellipse rx={13} ry={8} fill={PAPER} />
              <ellipse cy={-1} rx={7} ry={4} fill={FOOD} />
            </g>
          )}
          <text x={n.x} y={84} fontSize={11} fontWeight={800} fill={i === step ? GOLD : PAPER} textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CineArtPanel({ kind, cadet }: { kind: CineArt; cadet: boolean }) {
  return (
    <figure className="cine-art">
      {kind === "orbit" && <OrbitArt cadet={cadet} />}
      {kind === "track" && (
        <>
          <RescueTrack stage={0} animate dark />
          <figcaption>You'll see this track at the top of the screen.</figcaption>
        </>
      )}
      {kind === "shift-plan" && <ShiftCycleArt step={0} />}
      {kind === "shift-jump" && <ShiftCycleArt step={1} />}
      {kind === "shift-meal" && <ShiftCycleArt step={2} />}
    </figure>
  );
}
