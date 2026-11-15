// Visual-first text: **bold**, {c:chip} and a few auto-coloured key phrases and numbers.
// c: p power, f food, s shield, e earth, d danger, r research.
// Signaling only works when it is sparse (Mayer): whole item names are one phrase, filler words stay plain.
import type { ReactNode } from "react";

const PHRASES: [string, string][] = [
  ["food pack|garden kit|meals?|plates?|food|harvest|garden", "f"],
  ["spare battery|workshop battery|battery|power", "p"],
  ["water tank|supply crates?|shelter|shield|wall|water", "s"],
  ["earth|radio|message|reply", "e"],
  ["solar storm|solar flare|particle storm|storm|flare|particles?|radiation|sun", "d"],
  ["research crate|research|samples?|plants?", "r"],
];
const KIND = PHRASES.map(([words, kind]) => [new RegExp(`^(?:${words})$`, "i"), kind] as const);
const TOKEN = new RegExp(
  `(\\*\\*[^*]+\\*\\*|\\{[pfsedr]:[^}]+\\}|(?<![\\w.])[+−-]?\\d+(?![\\w.])|\\b(?:${PHRASES.map(([w]) => w).join("|")})\\b)`,
  "gi",
);

function words(text: string, key: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    const k = `${key}-${i}`;
    if (part.startsWith("**")) return <b key={k}>{words(part.slice(2, -2), k)}</b>;
    const m = /^\{([pfsedr]):(.+)\}$/.exec(part);
    if (m) return <span key={k} className={`kw chip kw-${m[1]}`}>{m[2]}</span>;
    if (/^[+−-]?\d+$/.test(part)) return <b key={k} className="num">{part}</b>;
    const kind = KIND.find(([re]) => re.test(part));
    return kind ? <span key={k} className={`kw kw-${kind[1]}`}>{part}</span> : part;
  });
}

export function Rich({ text }: { text: string }) {
  return <>{words(text, "r")}</>;
}

/** Markup stripped, for text-to-speech and aria labels. */
export const plain = (text: string) =>
  text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\{[pfsedr]:([^}]+)\}/g, "$1");
