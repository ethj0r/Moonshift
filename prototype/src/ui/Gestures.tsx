import { sfx } from "../audio";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

const norm = (deg: number) => ((deg % 360) + 360) % 360;
export const angleGap = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
};

/** Drag around the ring (or use the arrow buttons / ←→ keys) to turn a part. */
export function Dial({
  value,
  target,
  onChange,
  label,
  goal,
}: {
  value: number;
  target: number;
  onChange: (deg: number) => void;
  label: string;
  goal: "pipe" | "earth";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const set = (deg: number) => {
    const next = norm(Math.round(deg / 15) * 15);
    if (next !== value) sfx("tick");
    onChange(next);
  };
  const fromPointer = (event: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    set((Math.atan2(dx, -dy) * 180) / Math.PI);
  };
  const aligned = angleGap(value, target) < 8;
  return (
    <div className="dial-wrap" data-own-keys>
      <div
        ref={ref}
        className={`dial ${aligned ? "aligned" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={345}
        aria-valuenow={value}
        aria-valuetext={aligned ? "Lined up" : `${value} degrees`}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => dragging.current && fromPointer(event)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") set(value - 15);
          else if (event.key === "ArrowRight" || event.key === "ArrowUp") set(value + 15);
          else return;
          event.preventDefault();
        }}
      >
        <span className="dial-target" style={{ transform: `rotate(${target}deg)` }}>
          {goal === "earth" ? "🌍" : "▲"}
        </span>
        <span className="dial-hand" style={{ transform: `rotate(${value}deg)` }} />
        <span className="dial-hub" />
      </div>
      <div className="dial-buttons">
        <button className="icon-button" aria-label="Turn left" onClick={() => set(value - 15)}>
          ⟲
        </button>
        <button className="icon-button" aria-label="Turn right" onClick={() => set(value + 15)}>
          ⟳
        </button>
      </div>
    </div>
  );
}

/** Press and hold (no fast tapping): pull the food pack ribbon. */
export function Hold({ label, onDone, reducedMotion }: { label: string; onDone: () => void; reducedMotion: boolean }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stop = () => {
    clearInterval(timer.current);
    setProgress((p) => (p >= 1 ? p : 0));
  };
  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => {
    if (progress >= 1) {
      clearInterval(timer.current);
      onDone();
    }
  }, [progress]);
  const start = () => {
    clearInterval(timer.current);
    timer.current = setInterval(() => setProgress((p) => Math.min(1, p + (reducedMotion ? 0.5 : 0.1))), 80);
  };
  return (
    <button
      className="button hold-button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(event) => (event.key === " " || event.key === "Enter") && !event.repeat && start()}
      onKeyUp={stop}
      style={{ ["--fill" as string]: `${progress * 100}%` }}
    >
      <Icon name="food" />
      {label}
    </button>
  );
}

/** Tap each pot to harvest it into the basket. */
export function Pots({ onDone }: { onDone: () => void }) {
  const [picked, setPicked] = useState([false, false, false]);
  useEffect(() => {
    if (picked.every(Boolean)) onDone();
  }, [picked]);
  return (
    <div className="pots" role="group" aria-label="Garden pots">
      {picked.map((done, i) => (
        <button
          key={i}
          className={`pot ${done ? "done" : ""}`}
          aria-label={done ? `Pot ${i + 1} picked` : `Pick pot ${i + 1}`}
          aria-pressed={done}
          onClick={() => setPicked((list) => list.map((value, j) => value || i === j))}
        >
          <Icon name="garden" size={30} />
        </button>
      ))}
    </div>
  );
}
