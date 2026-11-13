import type { CSSProperties } from "react";

export type IconName =
  | "food"
  | "power"
  | "cargo"
  | "air"
  | "garden"
  | "research"
  | "radio"
  | "crew"
  | "pause"
  | "close"
  | "rotate"
  | "check"
  | "help"
  | "settings"
  | "arrow"
  | "warning"
  | "shield"
  | "eye"
  | "speaker"
  | "mail"
  | "lock"
  | "star";
const paths: Record<IconName, string> = {
  food: "M5 5h14l2 4v12H3V9l2-4zm2 2v3h10V7H7zm3 6v5h4v-5h-4z",
  power: "M13 1 4 14h7l-1 9 10-14h-7l1-8z",
  cargo: "M3 5h18v16H3V5zm2 2v4h14V7h-5v3h-4V7H5zm3 8v2h8v-2H8z",
  air: "M2 6h12V3l8 5-8 5v-3H2V6zm0 9h8v4H2v-4zm11 0h9v4h-9v-4z",
  garden: "M11 21v-9C4 13 2 9 3 3c6 0 10 2 10 7 1-5 4-6 8-6 1 7-2 9-7 9v8h-3z",
  research:
    "M7 2h10v3h-2v5l5 9c1 2 0 3-2 3H6c-2 0-3-1-2-3l5-9V5H7V2zm4 9-2 4h6l-2-4V5h-2v6z",
  radio:
    "M4 3c0 8 6 14 14 14l3-3L7 0 4 3zm7 14-3 6h13v-3h-8l1-3h-3zm2-14a8 8 0 0 1 8 8h3A11 11 0 0 0 13 0v3z",
  crew: "M4 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM1 15h6v7H1v-7zm8-4h6v11H9V11zm8 4h6v7h-6v-7z",
  pause: "M5 3h5v18H5V3zm9 0h5v18h-5V3z",
  close: "m5 2 7 7 7-7 3 3-7 7 7 7-3 3-7-7-7 7-3-3 7-7-7-7 3-3z",
  rotate: "M12 2a10 10 0 1 1-10 12h4a6 6 0 1 0 6-8v4L4 4l8-4v2z",
  check: "m2 12 4-4 5 5L21 3l3 4-13 14L2 12z",
  help: "M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm0 4c6 0 7 7 2 9v1h-4v-4c4 0 5-3 2-3-2 0-2 1-2 2H6c0-3 2-5 6-5zm-2 12h4v4h-4v-4z",
  settings:
    "m9 1 6 0 1 4 4 1 3 5-3 3 0 4-5 3-3-2-4 2-5-3V14l-3-3 3-5 4-1 2-4zm3 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  arrow: "M2 10h12V4l9 8-9 8v-6H2v-4z",
  warning: "M10 2h4l10 20H0L10 2zm0 6v7h4V8h-4zm0 9v3h4v-3h-4z",
  shield: "M12 1 3 5v7c0 6 4 10 9 11 5-1 9-5 9-11V5l-9-4zm0 4 5 2v5c0 4-2 6-5 7V5z",
  eye: "M12 4C6 4 2 9 1 12c1 3 5 8 11 8s10-5 11-8c-1-3-5-8-11-8zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  speaker: "M3 9h4l6-5v16l-6-5H3V9zm13-1a6 6 0 0 1 0 8l-2-2a3 3 0 0 0 0-4l2-2zm3-3a10 10 0 0 1 0 14l-2-2a7 7 0 0 0 0-10l2-2z",
  mail: "M2 5h20v14H2V5zm2 3v9h16V8l-8 5-8-5zm1-1 7 4 7-4H5z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3h2v12H5V10h2zm3 0h4V7a2 2 0 0 0-4 0v3z",
  star: "m12 1 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7z",
};

export function Icon({
  name,
  size = 22,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
