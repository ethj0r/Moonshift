# GDD TEMPLATE — CONTENT BRIEF

You are writing one or two tabs of a **professional, reusable Game Design Document (GDD) template** that will be rendered into a Google Doc. The reader is a game designer, producer, or small studio who duplicated the template and must fill it in.

## Non-negotiable style

- **Language:** English. Direct, concrete, production-grade. No hype, no filler, no "in today's fast-paced world".
- **Voice:** imperative guidance ("Write the loop as three verbs…"), not academic prose.
- **Audience:** a multidisciplinary team (design, art, engineering, audio, production, marketing).
- **Length:** each tab 2,000–3,500 words. Dense and scannable, not padded.
- **No emojis.** Use en dash (–) only inside ranges. Avoid em dashes as sentence punctuation.
- **No fake game specifics** except inside `{{...}}` placeholders. Placeholders must be realistic examples of a good answer, not "TBD".
- **Every section must be actionable.** Explain *what to write*, *why it matters*, and *what good looks like*.
- **No markdown** inside `x` values. Only the inline markup described below.
- **Do not mention** that this was AI-generated, or refer to "this template" excessively.

## JSON schema

Write a file:

```json
{ "tab": "02 Gameplay & Systems", "blocks": [ ... ] }
```

Allowed block types:

| `t` | fields | purpose |
|---|---|---|
| `kicker` | `x` | tiny mono label above the H1, e.g. `SECTION 02 · GAMEPLAY` |
| `h1` | `x` | tab title, sentence case, e.g. `Gameplay & Systems` |
| `purpose` | `x` | one sentence: "This tab answers: …" |
| `ins` | `x` | instruction block, mono grey. 1–3 sentences. Starts with a verb. |
| `h2` | `x` | numbered section, e.g. `2.1 Core loop` |
| `h3` | `x` | sub-section, no number |
| `p` | `x` | body paragraph |
| `fill` | `x` | body paragraph that is mostly a fillable field, e.g. `Target session: {{20–30 minutes}}` |
| `bul` | `x` array | bullet list |
| `num` | `x` array | numbered list |
| `check` | `x` array | checkbox list |
| `table` | `head` array, `rows` array of arrays, `w` array of column widths (pt, sum ≈ 504) | data table |
| `callout` | `label`, `x` | one highlighted rule/insight. Max 1 per tab. |
| `quote` | `x` | pull quote / example. Max 2 per tab. |
| `hr` | – | thin divider |
| `pb` | – | page break |

Inline markup inside any text:
- `**bold**`
- `*italic*`
- `{{placeholder}}` → rendered italic blue. Use for anything the team must replace.
- Do not nest markup.

Table rules: 2–5 columns; header is a short noun phrase; 3–8 rows; cell text under 20 words. Use tables for inventories, comparisons, decisions, and parameters — not for prose.

## Required shape of every tab

1. `kicker`, `h1`, `purpose`
2. `ins` explaining how to use the tab (what to fill first, what to postpone)
3. Sections with `h2`; each `h2` is followed immediately by an `ins` with concrete writing guidance, then `p` / `fill` / `bul` / `table`.
4. Near the end: `h2` **Definition of done** + `check` list of 5–8 verifiable conditions.
5. Final `h2` **Open questions** + `table` with columns `Question | Owner | Needed by` and 3–5 rows of realistic `{{...}}` examples.
6. End with `hr`.

Do not add a "Conclusion" or summary section. Do not add a table of contents.

## What makes the guidance good

Bad: "Describe your core loop."
Good: "Write the loop as a cycle of 3–5 verbs. For each verb, name the player input, the immediate feedback, and the reward. If a verb has no feedback within 200 ms, it is not a loop yet."

Bad: "Consider accessibility."
Good: "List the input remapping, subtitle, colour-blind, and difficulty options you will ship. Name the WCAG success criteria you are targeting for menus and the minimum text size at 1080p."

## Your assignment

Follow the outline in the prompt exactly. Cover every listed section; you may add at most one extra section if the game type demands it. Keep headings numbered to match the prompt.

Return only the JSON file path and a one-line word count when done.
