// The end of a mission for a 7–12 year old: who is OK (crew check), why (the choices, shift by shift),
// what we learned, and the decision tree of every branch (after Detroit: Become Human's flowchart).
// Pictures are renders of the game's own 3D models (tools/report-art), so the report looks like the game.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { bestDose, choiceChain, crewDose, crewWishes, endingName, MEALS_NEEDED, outcome, particles, verdict, type Step } from "../game/report";
import { BADGES, ending, lesson, type Badge, type Crew, type State } from "../game/rules";
import type { Expression } from "../scene/face";
import { needsOf, runPath, TREE, TREE_NODES } from "../game/tree";
import { Icon } from "./Icons";
import { Rich } from "./Rich";
import "./report.css";

const art = (name: string) => `${import.meta.env.BASE_URL}assets/report/${name}.webp`;
const CREW: { id: Crew; file: string; name: string }[] = [
  { id: "commander", file: "a", name: "Commander" },
  { id: "technician", file: "b", name: "Technician" },
  { id: "researcher", file: "c", name: "Researcher" },
];
const faceOf = (s: State): Expression => {
  const o = outcome(s);
  return o === "safe" ? "happy" : o === "hungry" ? "tired" : "worried";
};

/** Seeded positions so the particles don't jump between renders. */
function motes(n: number, seed: number) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x: 8 + r() * 84, y: 6 + r() * 80, d: r() * 2 }));
}

function CrewStage({ state }: { state: State }) {
  const face = faceOf(state);
  const wishes = crewWishes(state);
  const level = particles(state);
  const count = level === "high" ? 18 : level === "some" ? 8 : 0;
  return (
    <div className={`crew-stage mood-${face}`}>
      <div className="stage-floor" aria-hidden="true" />
      {CREW.map((c, i) => (
        <figure key={c.id} className="crew-figure" style={{ ["--i" as string]: i }}>
          <div className={`wish-bubble ${wishes[c.id].met ? "met" : "unmet"}`}>
            <span className="wish-mark" aria-hidden="true">
              {wishes[c.id].met ? <Icon name="check" size={12} /> : <Icon name="close" size={10} />}
            </span>
            <span className="wish-text">
              “{wishes[c.id].wish}”
              <small>{wishes[c.id].met ? "You did it" : "Didn't happen"}</small>
            </span>
          </div>
          <div className="crew-body">
            <img src={art(`crew-${c.file}-${face}`)} alt={`${c.name}, looking ${face}`} width={119} height={230} />
            {motes(count, 7 + i * 31).map((m, k) => (
              <i key={k} className="mote" style={{ left: `${m.x}%`, top: `${m.y}%`, animationDelay: `${m.d}s` }} />
            ))}
          </div>
          <figcaption className={`crew-name c-${c.id}`}>{c.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function ParticleGauge({ state, cadet }: { state: State; cadet: boolean }) {
  const dose = crewDose(state);
  const best = bestDose(state);
  const level = particles(state);
  const word = level === "low" ? "Few" : level === "some" ? "Some" : "Lots";
  return (
    <section className={`stat stat-particles lvl-${level}`} aria-label={`Particles that reached the crew: ${word}`}>
      <span className="stat-label">Particles that reached them</span>
      <strong className="stat-value">{word}</strong>
      <div className="gauge" aria-hidden="true">
        <span className="gauge-fill" style={{ width: `${dose}%` }} />
        <span className="gauge-mark" style={{ left: `${best}%` }}>
          <small>best wall</small>
        </span>
      </div>
      <span className="stat-scale">
        <span>none</span>
        <span>{cadet ? "as many as in the habitat" : `habitat = 100% · yours ${dose}%`}</span>
      </span>
    </section>
  );
}

function MealCount({ state }: { state: State }) {
  const eaten = MEALS_NEEDED - state.missed;
  return (
    <section className={`stat stat-meals ${state.missed ? "lvl-high" : "lvl-low"}`} aria-label={`Meals eaten: ${eaten} of ${MEALS_NEEDED}`}>
      <span className="stat-label">Meals eaten</span>
      <strong className="stat-value">
        {eaten} <small>of {MEALS_NEEDED}</small>
      </strong>
      <div className="plates" aria-hidden="true">
        {Array.from({ length: MEALS_NEEDED }, (_, i) => (
          <i key={i} className={i < eaten ? "full" : "empty"} />
        ))}
      </div>
      <span className="stat-scale">
        <span>1 meal every shift, +1 while the lander waits</span>
      </span>
    </section>
  );
}

/** Both endings: yours lit, the other with the recipe to reach it. */
function Endings({ state }: { state: State }) {
  const safe = ending(state) === "safe";
  return (
    <div className="endings" aria-label="The two endings">
      {[
        { id: "safe", name: "Safe and Sound", how: "Strong wall + crew inside + every meal" },
        { id: "rescue", name: "Rescue at Last", how: "Too many particles, or an empty plate" },
      ].map((e) => {
        const mine = (e.id === "safe") === safe;
        return (
          <div key={e.id} className={`ending-pill ${mine ? "mine" : ""} e-${e.id}`}>
            <Icon name={e.id === "safe" ? "star" : "rotate"} size={18} />
            <span>
              <b>{e.name}</b>
              <small>{e.how}</small>
            </span>
            {mine && <em>Your ending</em>}
          </div>
        );
      })}
    </div>
  );
}

function ShieldBar({ shield, need }: { shield: number; need: number }) {
  return (
    <div className="shield-bar" aria-label={`Shield ${shield}, this storm needed ${need}`}>
      <span className="cells">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} className={`${i < shield ? "on" : ""} ${i < need ? "needed" : ""}`} />
        ))}
      </span>
      <small>needed {need}</small>
    </div>
  );
}

function StepCard({ step, state }: { step: Step; state: State }) {
  return (
    <li className={`step ${step.good ? "good" : "bad"} ${step.decisive ? "decisive" : ""}`}>
      {step.decisive && <span className="step-ribbon">Changed the ending</span>}
      <div className="step-art">
        <img src={art(step.art)} alt="" width={120} height={120} />
        <span className="step-status" aria-label={step.good ? "Good choice" : "Went wrong"}>
          <Icon name={step.good ? "check" : "close"} size={step.good ? 14 : 11} />
        </span>
      </div>
      <span className="step-when">{step.when}</span>
      <h3 className="step-title">{step.title}</h3>
      {step.key === "wall" && <ShieldBar shield={state.shield} need={state.mission.storm.need} />}
      {step.key === "meals" && (
        <div className="plates small" aria-hidden="true">
          {Array.from({ length: MEALS_NEEDED }, (_, i) => (
            <i key={i} className={i < MEALS_NEEDED - state.missed ? "full" : "empty"} />
          ))}
        </div>
      )}
      <p className="step-led">{step.led}</p>
    </li>
  );
}

function Choices({ state }: { state: State }) {
  const chain = choiceChain(state);
  const wrong = chain.filter((s) => s.decisive);
  const safe = ending(state) === "safe";
  return (
    <>
      <ol className="steps" aria-label="Your choices, shift by shift">
        {chain.map((step) => (
          <StepCard key={step.key} step={step} state={state} />
        ))}
        <li className={`step step-end e-${ending(state)}`}>
          <span className="step-when">Ending</span>
          <span className="end-medal">
            <Icon name={safe ? "star" : "rotate"} size={30} />
          </span>
          <h3 className="step-title">{endingName(state)}</h3>
        </li>
      </ol>
      {wrong.length ? (
        <div className="what-if">
          <h3>What if you chose differently?</h3>
          {wrong.map((s) => (
            <div key={s.key} className="what-if-row">
              <span className="wi-when">{s.when}</span>
              <p className="wi-you">
                <small>You</small>
                {s.chose}
              </p>
              <Icon name="arrow" size={20} />
              <p className="wi-other">
                <small>Other way</small>
                {s.instead}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="what-if all-good">
          <h3>Every big choice worked.</h3>
          <p>Want a harder test? A new mission brings a random storm, sometimes a much bigger one.</p>
        </div>
      )}
    </>
  );
}

export function MissionReport(props: {
  page: number;
  setPage: (n: number) => void;
  state: State;
  cadet: boolean;
  badges: Badge[];
  known: Badge[];
  canNewMission: boolean;
  learnArt: ReactNode;
  onReplay: () => void;
  onNewMission: () => void;
  onTree: () => void;
  onFinish: () => void;
  onDataBook: () => void;
}) {
  const { state, page } = props;
  const l = lesson(state);
  const safe = ending(state) === "safe";
  const pages = ["Crew check", "Your choices", "What we learned"];
  const nextBadge = (["scientist", "crew", "strong"] as Badge[]).find((b) => !props.badges.includes(b));
  return (
    <section className={`report ${safe ? "is-safe" : "is-rescue"}`} role="dialog" aria-modal="true" aria-label={`Mission report: ${pages[page]}`}>
      <header className="report-top">
        <span className="overline">Mission report</span>
        <nav className="report-tabs" aria-label="Report pages">
          {pages.map((t, i) => (
            <button key={t} className={i === page ? "on" : ""} aria-current={i === page ? "step" : undefined} onClick={() => props.setPage(i)}>
              <span>{i + 1}</span> {t}
            </button>
          ))}
        </nav>
        <button className="report-x" aria-label="Close report" onClick={props.onFinish}>
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="report-page" key={page}>
        {page === 0 && (
          <>
            <div className="hero">
              <span className={`hero-medal ${safe ? "safe" : "rescue"}`} aria-hidden="true">
                <Icon name={safe ? "star" : "rotate"} size={30} />
              </span>
              <div>
                <h2 className="hero-title">{endingName(state)}</h2>
                <p className="hero-sub">{verdict(state)}</p>
              </div>
              <Endings state={state} />
            </div>
            <CrewStage state={state} />
            <div className="stats">
              <ParticleGauge state={state} cadet={props.cadet} />
              <MealCount state={state} />
            </div>
          </>
        )}
        {page === 1 && (
          <>
            <div className="hero compact">
              <div>
                <h2 className="hero-title">{safe ? "Every choice paid off" : "Where the ending changed"}</h2>
                <p className="hero-sub">{safe ? "Five big choices, shift by shift. All of them went the right way." : "Five big choices, shift by shift. The red card is where your ending changed."}</p>
              </div>
            </div>
            <Choices state={state} />
          </>
        )}
        {page === 2 && (
          <div className="learn">
            <div className="learn-main">
              <span className="overline dark">The big idea</span>
              <p className="learn-lesson">
                <Rich text={l.text} />
              </p>
              <p className="learn-tip">
                <Icon name="arrow" size={16} />
                <span>
                  <Rich text={l.tip} />
                </span>
              </p>
              <div className="learn-science">{props.learnArt}</div>
              <button className="text-button" onClick={props.onDataBook}>
                <Icon name="help" size={16} /> Where is this from?
              </button>
            </div>
            <aside className="learn-side">
              <button className="tree-cta" onClick={props.onTree}>
                <TreeGlyph />
                <span>
                  <strong>Decision tree</strong>
                  <small>Every path, and the branches you haven't found yet.</small>
                </span>
                <Icon name="arrow" size={18} />
              </button>
              <div className="badges-card">
                <span className="overline dark">Badges</span>
                <ul>
                  {(Object.keys(BADGES) as Badge[]).map((b) => {
                    const got = props.badges.includes(b);
                    return (
                      <li key={b} className={got ? "got" : ""}>
                        <span className="badge-icon">
                          <Icon name={got ? "star" : "lock"} size={16} />
                        </span>
                        <span>
                          <b>
                            {BADGES[b].name}
                            {got && !props.known.includes(b) && <em>new!</em>}
                          </b>
                          <small>{BADGES[b].how}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {nextBadge && (
                  <p className="next-try">
                    Try next: <b>{BADGES[nextBadge].name}</b>
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <footer className="report-bottom">
        {page > 0 && (
          <button className="button" onClick={() => props.setPage(page - 1)}>
            Back
          </button>
        )}
        <span className="spacer" />
        {page < 2 ? (
          <button className="button primary" autoFocus onClick={() => props.setPage(page + 1)}>
            {page === 0 ? "Why did this happen?" : "What did we learn?"} <Icon name="arrow" />
          </button>
        ) : (
          <>
            <button className="text-button light" onClick={props.onFinish}>
              Finish
            </button>
            {props.canNewMission && (
              <button className="button" onClick={props.onNewMission}>
                New mission · random storm
              </button>
            )}
            <button className="button primary" autoFocus onClick={props.onReplay}>
              Replay from shift 1 <Icon name="rotate" />
            </button>
          </>
        )}
      </footer>
    </section>
  );
}

function TreeGlyph() {
  return (
    <svg className="tree-glyph" viewBox="0 0 44 32" aria-hidden="true">
      <path d="M10 16 H18 M18 16 L28 7 M18 16 L28 25" stroke="currentColor" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <rect x={1} y={11} width={10} height={10} rx={3} fill="currentColor" />
      <rect x={28} y={2} width={14} height={10} rx={3} fill="currentColor" />
      <rect x={28} y={20} width={14} height={10} rx={3} fill="currentColor" opacity={0.35} />
    </svg>
  );
}

// ---------------------------------------------------------------- decision tree (left → right)
const COL_W = 196;
const COL_GAP = 34;
const HEAD_H = 92;
const NODE_W = 168;
const NODE_H = 54;
const NODE_GAP = 22;
const PAD = 22;

/** Wrap a short question into lines for SVG text. */
function wrap(text: string, max = 22) {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  return [...lines, line];
}

function layout() {
  const tallest = Math.max(...TREE.map((r) => r.nodes.length));
  const body = tallest * NODE_H + (tallest - 1) * NODE_GAP;
  const pos: Record<string, { x: number; y: number }> = {};
  TREE.forEach((row, c) => {
    const n = row.nodes.length;
    const h = n * NODE_H + (n - 1) * NODE_GAP;
    row.nodes.forEach((node, i) => {
      pos[node.id] = { x: PAD + c * (COL_W + COL_GAP) + COL_W / 2, y: HEAD_H + (body - h) / 2 + i * (NODE_H + NODE_GAP) + NODE_H / 2 };
    });
  });
  return { pos, width: PAD * 2 + TREE.length * COL_W + (TREE.length - 1) * COL_GAP, height: HEAD_H + body + PAD };
}

/**
 * Every branch of the mission, read left to right like the story. Found branches show their name;
 * branches not found yet are locked "?" boxes with a nudge. The gold line is this run's path, and
 * picking a box shows what it leads to (teal) and what it needs (grey).
 */
export function DecisionTree(props: { found: string[]; counts: Record<string, number>; runs: number; current: State | null; onClose: () => void }) {
  const { pos, width, height } = useMemo(layout, []);
  const path = props.current ? runPath(props.current) : [];
  const found = new Set([...props.found, ...path]);
  const [sel, setSel] = useState<string | null>(path.at(-1) ?? null);
  const node = sel ? TREE_NODES.find((n) => n.id === sel)! : null;
  const row = sel ? TREE.find((r) => r.nodes.some((n) => n.id === sel))! : null;
  const leads = node?.leads ?? [];
  const needs = sel ? needsOf(sel) : [];
  const total = TREE_NODES.length;
  const have = TREE_NODES.filter((n) => found.has(n.id)).length;
  const endings = TREE.at(-1)!.nodes.filter((n) => found.has(n.id)).length;
  const link = (a: string, b: string) => {
    const p = pos[a];
    const q = pos[b];
    const x1 = p.x + NODE_W / 2;
    const x2 = q.x - NODE_W / 2;
    if (x2 <= x1) return `M${p.x} ${p.y} L${q.x} ${q.y}`;
    const m = (x1 + x2) / 2;
    return `M${x1} ${p.y} C${m} ${p.y} ${m} ${q.y} ${x2} ${q.y}`;
  };
  const name = (id: string) => (found.has(id) ? TREE_NODES.find((n) => n.id === id)!.label : "?");
  // Keep the picked box in view; the tree is wider than the screen.
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !sel) return;
    const x = pos[sel].x - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, x), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [sel]);
  // Drag to pan with a mouse (touch and trackpads scroll natively).
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  return (
    <section className="tree-screen" role="dialog" aria-modal="true" aria-labelledby="tree-title" onKeyDown={(e) => e.key === "Escape" && props.onClose()}>
      <header className="report-top">
        <span className="overline">Decision tree · Mission 1</span>
        <h2 id="tree-title" className="tree-title">
          Every path to the end
        </h2>
        <button className="report-x" aria-label="Close decision tree" onClick={props.onClose}>
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="tree-stats">
        <div className="tree-stat">
          <b>
            {have}/{total}
          </b>
          <span>branches found</span>
          <span className="tree-bar" aria-hidden="true">
            <i style={{ width: `${(100 * have) / total}%` }} />
          </span>
        </div>
        <div className="tree-stat">
          <b>{endings}/2</b>
          <span>endings found</span>
        </div>
        <div className="tree-stat">
          <b>{props.runs}</b>
          <span>{props.runs === 1 ? "run played" : "runs played"}</span>
        </div>
        <ul className="tree-legend" aria-label="Legend">
          <li>
            <i className="lg-path" /> This run
          </li>
          <li>
            <i className="lg-found" /> Found
          </li>
          <li>
            <i className="lg-locked" /> Not found yet
          </li>
        </ul>
      </div>
      <div
        className="tree-canvas"
        ref={canvas}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") drag.current = { x: e.clientX, left: canvas.current!.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (Math.abs(e.clientX - d.x) > 4) d.moved = true;
          canvas.current!.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null))}
        onPointerLeave={() => (drag.current = null)}
        onClickCapture={(e) => {
          if (drag.current?.moved) e.stopPropagation();
        }}
      >
        <svg className="tree-svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="group" aria-label="Decision tree, left to right">
          <defs>
            <marker id="lead-head" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="#2fae9b" />
            </marker>
          </defs>
          {TREE.map((r, c) => {
            const x = PAD + c * (COL_W + COL_GAP);
            return (
              <g key={r.id} className={`tree-col ${row?.id === r.id ? "sel" : ""}`}>
                <rect x={x - 8} y={8} width={COL_W + 16} height={height - 16} rx={14} className="col-band" />
                <text x={x + COL_W / 2} y={30} className="col-when">
                  {r.when.toUpperCase()}
                </text>
                {wrap(r.title).map((line, i) => (
                  <text key={i} x={x + COL_W / 2} y={50 + i * 16} className="col-title">
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
          {path.slice(1).map((id, i) => (
            <path key={id} d={link(path[i], id)} className="tree-path" />
          ))}
          {sel && needs.map((id) => <path key={`n${id}`} d={link(id, sel)} className="tree-need" />)}
          {sel && leads.map((id) => <path key={`l${id}`} d={link(sel, id)} className={`tree-lead ${found.has(id) ? "" : "dim"}`} markerEnd="url(#lead-head)" />)}
          {TREE_NODES.map((n) => {
            const p = pos[n.id];
            const open = found.has(n.id);
            const mine = path.includes(n.id);
            const end = n.id.startsWith("end.");
            const share = props.runs > 1 ? Math.round((100 * (props.counts[n.id] ?? 0)) / props.runs) : null;
            return (
              <g
                key={n.id}
                className={`tnode ${open ? "found" : "locked"} ${mine ? "mine" : ""} ${sel === n.id ? "sel" : ""} ${end ? "end" : ""} ${n.tone ?? ""}`}
                transform={`translate(${p.x - NODE_W / 2} ${p.y - NODE_H / 2})`}
                role="button"
                tabIndex={0}
                aria-label={open ? `${n.label}${mine ? ", this run" : ""}` : "Not found yet"}
                aria-pressed={sel === n.id}
                onClick={() => setSel(n.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(n.id))}
              >
                <rect className="tbox" width={NODE_W} height={NODE_H} rx={end ? NODE_H / 2 : 10} />
                {open && n.tone && !end && <rect className="tone-bar" x={0} y={8} width={5} height={NODE_H - 16} rx={2.5} />}
                {open ? (
                  <>
                    <text x={NODE_W / 2} y={NODE_H / 2 + (share !== null ? -2 : 5)} className="tlabel">
                      {n.label}
                    </text>
                    {share !== null && (
                      <text x={NODE_W / 2} y={NODE_H / 2 + 15} className="tcount">
                        {share}% of your runs
                      </text>
                    )}
                  </>
                ) : (
                  <>
                    <text x={NODE_W / 2} y={NODE_H / 2 + 7} className="tq">
                      ?
                    </text>
                    <g transform={`translate(${NODE_W - 24} ${NODE_H / 2 - 7})`} className="tlock">
                      <rect x={0} y={5} width={12} height={9} rx={2} />
                      <path d="M2.5 5 V3 a3.5 3.5 0 0 1 7 0 V5" />
                    </g>
                  </>
                )}
                {mine && (
                  <g transform={`translate(${NODE_W - 6} -6)`}>
                    <circle r={10} className="you-dot" />
                    <text y={4} className="you-txt">
                      ★
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="tree-detail" aria-live="polite">
        {node && row ? (
          <>
            <div className="td-head">
              <span className="overline dark">
                {row.when} · {row.title}
              </span>
              <h3>{found.has(node.id) ? node.label : "Not found yet"}</h3>
            </div>
            <div className="td-body">
              {found.has(node.id) ? (
                <>
                  {path.includes(node.id) && <p className="td-you">★ Your choice this run</p>}
                  <p>{node.detail}</p>
                </>
              ) : (
                <p className="td-hint">
                  <Icon name="help" size={15} /> Hint: {node.hint}
                </p>
              )}
            </div>
            <div className="td-links">
              {needs.length > 0 && (
                <div>
                  <span className="td-label">Needs</span>
                  {needs.map((id) => (
                    <button key={id} className="td-chip need" onClick={() => setSel(id)}>
                      {name(id)}
                    </button>
                  ))}
                </div>
              )}
              {leads.length > 0 && (
                <div>
                  <span className="td-label">Leads to</span>
                  {leads.map((id) => (
                    <button key={id} className="td-chip lead" onClick={() => setSel(id)}>
                      {name(id)} <Icon name="arrow" size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <p>Pick a box to see what it does and where it leads.</p>
        )}
      </div>
    </section>
  );
}
