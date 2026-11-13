// "What you know" infographics: one still drawing per shift, built from the game's own pieces (power meter,
// shelter grid, goggles lines, food plates, the pipe) so the picture teaches how to read what comes next.
// Labels sit on the drawing (spatial contiguity). Colours match the keywords in the sentence above it.
import type { Stage } from "../game/rules";

const INK = "#2c3a4e";
const SOFT = "#5b6779";
const CORAL = "#d9472f";
const GOLD = "#f4b23a";
const TEAL = "#23766b";
const PAPER = "#fff6e8";
const CRATE = "#d9a066";
const WOOD = "#a66a34";
const AIR = "#2f86b9";
const FOOD = "#4f9a55";

const Sun = ({ x, y }: { x: number; y: number }) => (
  <g>
    <g stroke={GOLD} strokeWidth={3} strokeLinecap="round">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={x + Math.cos(r) * 27} y1={y + Math.sin(r) * 27} x2={x + Math.cos(r) * 34} y2={y + Math.sin(r) * 34} />;
      })}
    </g>
    <circle cx={x} cy={y} r={21} fill={GOLD} />
  </g>
);
const Crew = ({ x, y, fill = PAPER }: { x: number; y: number; fill?: string }) => (
  <g>
    <circle cx={x} cy={y - 8} r={8} fill={fill} stroke={INK} strokeWidth={2} />
    <rect x={x - 8} y={y + 1} width={16} height={13} rx={4} fill={fill} stroke={INK} strokeWidth={2} />
  </g>
);
const Label = ({ x, y, children, color = INK, size = 12, anchor = "middle" }: { x: number; y: number; children: string; color?: string; size?: number; anchor?: "start" | "middle" | "end" }) => (
  <text x={x} y={y} fontSize={size} fontWeight={800} fill={color} textAnchor={anchor}>
    {children}
  </text>
);
const Arrow = ({ id, color }: { id: string; color: string }) => (
  <marker id={id} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
    <path d="M0 0 L10 5 L0 10 z" fill={color} />
  </marker>
);
const Bolt = ({ x, y, fill, stroke }: { x: number; y: number; fill: string; stroke?: string }) => (
  <path d={`M${x + 4} ${y} L${x - 10} ${y + 22} H${x} L${x - 4} ${y + 40} L${x + 12} ${y + 16} H${x + 2} Z`} fill={fill} stroke={stroke} strokeWidth={stroke ? 2.5 : 0} strokeLinejoin="round" />
);
const Lock = ({ x, y }: { x: number; y: number }) => (
  <g>
    <rect x={x} y={y} width={11} height={10} rx={2} fill={PAPER} />
    <path d={`M${x + 2.5} ${y} v-3 a3 3 0 0 1 6 0 v3`} fill="none" stroke={PAPER} strokeWidth={2} />
  </g>
);

const ART: Partial<Record<Stage, { label: string; box: string; body: React.ReactNode }>> = {
  0: {
    label: "The Sun sends particles. A wall of heavy stuff stops them, and the crew behind the wall is safe.",
    box: "0 0 320 168",
    body: (
      <>
        <defs>
          <Arrow id="k0" color={CORAL} />
        </defs>
        <Sun x={36} y={74} />
        <g stroke={CORAL} strokeWidth={3} strokeDasharray="7 4" markerEnd="url(#k0)">
          <line x1={62} y1={60} x2={142} y2={48} />
          <line x1={64} y1={76} x2={142} y2={78} />
          <line x1={62} y1={92} x2={142} y2={108} />
        </g>
        <g stroke={WOOD} strokeWidth={2}>
          <rect x={150} y={32} width={22} height={30} rx={3} fill={CRATE} />
          <rect x={174} y={32} width={22} height={30} rx={3} fill="#9aa3ad" />
          <rect x={150} y={64} width={22} height={30} rx={3} fill="#8fbf7a" />
          <rect x={174} y={64} width={22} height={30} rx={3} fill={CRATE} />
          <rect x={150} y={96} width={22} height={30} rx={3} fill="#9aa3ad" />
          <rect x={174} y={96} width={22} height={30} rx={3} fill="#8fbf7a" />
        </g>
        <Crew x={252} y={84} />
        <path d="M268 64 l6 6 l12 -14" fill="none" stroke={TEAL} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Label x={36} y={124}>Sun</Label>
        <Label x={102} y={40} color={CORAL}>particles</Label>
        <Label x={173} y={146}>wall of heavy stuff</Label>
        <Label x={252} y={124} color={TEAL}>crew: safe</Label>
      </>
    ),
  },
  1: {
    label: "Earth: wind moves the air. Moon: no wind, so the air stays put. In the outpost the habitat is on the left, a pipe with a bent joint in the middle, and a fan on the right.",
    box: "0 0 320 214",
    body: (
      <>
        <defs>
          <clipPath id="k1e">
            <rect x={0} y={0} width={150} height={92} rx={12} />
          </clipPath>
          <clipPath id="k1m">
            <rect x={170} y={0} width={150} height={92} rx={12} />
          </clipPath>
          <Arrow id="k1" color="#4f8fca" />
        </defs>
        <g clipPath="url(#k1e)">
          <rect x={0} y={0} width={150} height={92} fill="#dff0fb" />
          <rect x={0} y={74} width={150} height={18} fill="#a8d08d" />
          <g fill="none" stroke="#4f8fca" strokeWidth={3} markerEnd="url(#k1)">
            <path d="M14 34 C40 22 64 46 92 34 S124 26 136 32" />
            <path d="M14 58 C40 46 64 70 92 58 S124 50 136 56" />
          </g>
          <g fill="#bfe6fa" stroke={AIR} strokeWidth={1.5}>
            {[[30, 30], [66, 40], [104, 31], [46, 55], [86, 60]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={4} />)}
          </g>
        </g>
        <Label x={10} y={17} anchor="start">Earth</Label>
        <g clipPath="url(#k1m)">
          <rect x={170} y={0} width={150} height={92} fill="#34435a" />
          <rect x={170} y={74} width={150} height={18} fill="#b9b4ab" />
          <path d="M262 18 q6 -6 12 0 t12 0 t12 0" fill="none" stroke="#9fb0c6" strokeWidth={3} />
          <line x1={264} y1={26} x2={296} y2={8} stroke={CORAL} strokeWidth={3} strokeLinecap="round" />
          <g fill="#bfe6fa" stroke={AIR} strokeWidth={1.5}>
            {[[196, 44], [230, 58], [262, 42], [292, 60], [214, 64]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={4} />)}
          </g>
        </g>
        <Label x={180} y={17} anchor="start" color={PAPER}>Moon</Label>
        <Label x={75} y={110}>wind moves air</Label>
        <Label x={245} y={110}>no wind: air stays put</Label>
        {/* Drawn fan-left, then mirrored: in the outpost the habitat is on the left and the fan on the right. */}
        <g transform="translate(320 0) scale(-1 1)">
        <rect x={6} y={132} width={54} height={56} rx={10} fill="#f7e6c8" stroke={INK} strokeWidth={2.5} />
        <circle cx={33} cy={160} r={19} fill={PAPER} stroke={INK} strokeWidth={2} />
        <g fill={TEAL}>
          <path d="M33 160 L33 143 Q42 148 33 160z" />
          <path d="M33 160 L48 168 Q40 175 33 160z" />
          <path d="M33 160 L18 168 Q20 158 33 160z" />
        </g>
        <line x1={60} y1={160} x2={126} y2={160} stroke="#9aa3ad" strokeWidth={12} />
        <polyline points="126,160 156,138 186,160" fill="none" stroke="#f0a030" strokeWidth={12} strokeLinejoin="round" />
        <line x1={186} y1={160} x2={252} y2={160} stroke="#9aa3ad" strokeWidth={12} />
        <path d="M250 188 V162 a32 32 0 0 1 64 0 V188 Z" fill="#f7e6c8" stroke="#e2683a" strokeWidth={3} />
        <rect x={274} y={166} width={16} height={22} rx={3} fill="#5a98d6" />
        </g>
        <Label x={287} y={206}>fan</Label>
        <Label x={227} y={146} color={SOFT} size={11}>pipe</Label>
        <Label x={164} y={126} color="#b86e00">bent joint</Label>
        <Label x={38} y={206}>habitat</Label>
      </>
    ),
  },
  2: {
    label: "The power meter: 3 power each shift. Two cells are locked for the air and always on. One cell is free for one thing. A battery adds one more cell.",
    box: "0 0 320 150",
    body: (
      <>
        <Label x={120} y={14}>3 power each shift</Label>
        <path d="M18 26 V20 H222 V26" fill="none" stroke={INK} strokeWidth={2} />
        <rect x={18} y={34} width={60} height={60} rx={12} fill={INK} />
        <rect x={88} y={34} width={60} height={60} rx={12} fill={INK} />
        <Bolt x={48} y={44} fill={GOLD} />
        <Bolt x={118} y={44} fill={GOLD} />
        <Lock x={62} y={78} />
        <Lock x={132} y={78} />
        <rect x={160} y={35.5} width={57} height={57} rx={12} fill={PAPER} stroke={GOLD} strokeWidth={3} strokeDasharray="7 5" />
        <Bolt x={188} y={44} fill="none" stroke={GOLD} />
        <Label x={234} y={70} size={20} color="#b8a27c">+</Label>
        <rect x={248} y={36} width={56} height={56} rx={12} fill="none" stroke="#c9b48f" strokeWidth={2} strokeDasharray="4 4" />
        <g fill="none" stroke="#a08a63" strokeWidth={2.5}>
          <rect x={262} y={52} width={26} height={28} rx={4} />
          <path d="M270 48 h10" />
        </g>
        <path d="M18 102 V108 H148 V102" fill="none" stroke={INK} strokeWidth={2} />
        <Label x={83} y={124}>air · always on</Label>
        <Label x={189} y={124} color="#9a6a00">free</Label>
        <Label x={276} y={124} color={SOFT}>+1</Label>
        <g fontSize={11} fill={SOFT} textAnchor="middle">
          <text x={83} y={139}>locked cells</text>
          <text x={189} y={139}>for 1 thing</text>
          <text x={276} y={139}>with a battery</text>
        </g>
      </>
    ),
  },
  3: {
    label: "Top view of the shelter: the crew in the middle of a 3 by 3 ring. A particle line from the Sun hits a crate and stops. Another passes through an empty square and reaches the crew.",
    box: "0 0 320 210",
    body: (
      <>
        <defs>
          <Arrow id="k3" color={CORAL} />
        </defs>
        <Sun x={36} y={104} />
        <Label x={36} y={158}>Sun</Label>
        <g fill="#f3e7d2" stroke="#d8c6a6" strokeWidth={2}>
          {[[200, 30], [250, 30], [250, 80], [150, 130], [200, 130], [250, 130]].map(([x, y]) => (
            <rect key={`${x}${y}`} x={x} y={y} width={46} height={46} rx={6} />
          ))}
        </g>
        <rect x={150} y={80} width={46} height={46} rx={6} fill={PAPER} stroke="#c9b48f" strokeWidth={2} strokeDasharray="5 4" />
        <rect x={150} y={30} width={46} height={46} rx={6} fill={CRATE} stroke={WOOD} strokeWidth={2.5} />
        <path d="M150 53 H196 M173 30 V76" stroke={WOOD} strokeWidth={3} />
        <rect x={200} y={80} width={46} height={46} rx={6} fill={INK} />
        <Crew x={223} y={104} />
        <line x1={58} y1={94} x2={144} y2={56} stroke={CORAL} strokeWidth={3} strokeDasharray="7 4" />
        <path d="M140 50 l8 8 M148 50 l-8 8" stroke={CORAL} strokeWidth={3} strokeLinecap="round" />
        <line x1={60} y1={104} x2={206} y2={103} stroke={CORAL} strokeWidth={3} strokeDasharray="7 4" markerEnd="url(#k3)" />
        <Label x={173} y={22} color={CORAL}>stopped</Label>
        <Label x={104} y={124} color={CORAL}>gets in</Label>
        <rect x={96} y={186} width={14} height={14} rx={3} fill={CRATE} stroke={WOOD} strokeWidth={1.5} />
        <Label x={116} y={198} anchor="start" size={11}>crate: stops</Label>
        <rect x={196} y={186} width={14} height={14} rx={3} fill={PAPER} stroke="#c9b48f" strokeWidth={1.5} strokeDasharray="3 2" />
        <Label x={216} y={198} anchor="start" size={11}>empty: lets in</Label>
      </>
    ),
  },
  4: {
    label: "Particles come at the habitat, which has a thin wall, and at the shelter, which has your wall. Each place has an empty bar under it.",
    box: "0 0 320 156",
    body: (
      <>
        <defs>
          <Arrow id="k4" color={CORAL} />
        </defs>
        <Label x={80} y={16}>habitat</Label>
        <Label x={240} y={16}>shelter</Label>
        <g stroke={CORAL} strokeWidth={3} strokeDasharray="6 4" markerEnd="url(#k4)">
          {[40, 62, 84].map((y) => <line key={y} x1={8} y1={y} x2={66} y2={y} />)}
          {[40, 62, 84].map((y) => <line key={y} x1={168} y1={y} x2={222} y2={y} />)}
        </g>
        <line x1={74} y1={28} x2={74} y2={98} stroke={INK} strokeWidth={3} />
        <Crew x={114} y={62} />
        <g stroke={WOOD} strokeWidth={2} fill={CRATE}>
          <rect x={228} y={28} width={28} height={22} rx={3} />
          <rect x={228} y={52} width={28} height={22} rx={3} />
          <rect x={228} y={76} width={28} height={22} rx={3} />
        </g>
        <Crew x={286} y={62} />
        <Label x={74} y={116} size={11}>thin wall</Label>
        <Label x={242} y={116} size={11}>your wall</Label>
        <g fill={PAPER} stroke={INK} strokeWidth={2}>
          <rect x={20} y={130} width={120} height={18} rx={9} />
          <rect x={180} y={130} width={120} height={18} rx={9} />
        </g>
      </>
    ),
  },
  5: {
    label: "Shift 5 needs one meal and the rescue needs one meal. A full plate is a meal you have. A dashed plate is a missing meal. These are the same plates as the food meter at the top left.",
    box: "0 0 320 128",
    body: (
      <>
        <defs>
          <Arrow id="k5" color={INK} />
        </defs>
        <Label x={58} y={16}>Shift 5</Label>
        <Label x={178} y={16}>Rescue</Label>
        <circle cx={58} cy={58} r={26} fill="#ffffff" stroke="#c9b48f" strokeWidth={3} />
        <circle cx={58} cy={58} r={15} fill={FOOD} />
        <circle cx={178} cy={58} r={26} fill="none" stroke={CORAL} strokeWidth={3} strokeDasharray="6 5" />
        <Label x={178} y={64} size={18} color={CORAL}>?</Label>
        <line x1={92} y1={58} x2={144} y2={58} stroke={INK} strokeWidth={2.5} markerEnd="url(#k5)" />
        <Label x={118} y={48} size={10.5} color={SOFT}>1 each</Label>
        <Label x={58} y={104} color={FOOD}>meal you have</Label>
        <Label x={178} y={104} color={CORAL}>missing meal</Label>
        <rect x={236} y={36} width={80} height={44} rx={10} fill={PAPER} stroke="#d8c6a6" strokeWidth={2} />
        <Label x={246} y={52} anchor="start" size={9} color={TEAL}>FOOD</Label>
        <circle cx={254} cy={66} r={7} fill={FOOD} />
        <circle cx={274} cy={66} r={7} fill="none" stroke={CORAL} strokeWidth={2} strokeDasharray="3 3" />
        <Label x={276} y={104}>food meter</Label>
        <Label x={276} y={120} size={11} color={SOFT}>top left</Label>
      </>
    ),
  },
};

export function KnowArt({ stage }: { stage: Stage }) {
  const art = ART[stage];
  if (!art) return null;
  return (
    <svg className="know-art" viewBox={art.box} role="img" aria-label={art.label}>
      {art.body}
    </svg>
  );
}
