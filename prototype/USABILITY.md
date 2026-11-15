# Usability review: playing MOONSHIFT as a kid

Date: 2026-11-13 · Branch `gdd-v2` · Build after the cutscene, guidance and clue work.

This document records a heuristic walkthrough of Mission 1, what it found, what was changed, and the HCI and learning-science reasons behind each change. It ends with the issues still open and a protocol for testing with real children.

## Method and its limits

The developer (with an AI coding assistant) played the full mission in **Cadet** mode the way a 7–9-year-old would: no prior knowledge, reading only what is on screen, tapping what looks tappable, and ignoring keyboard shortcuts. The game ran in desktop Chromium at 1280×720, driven step by step with a screenshot after each action. Every shift (cargo, S1–S5, rescue, the three debrief screens) was played twice: once to find problems, once to confirm the fixes.

This is an **expert walkthrough, not a child study**. It catches interface problems such as hidden buttons, jargon, and silent failures. It cannot tell us what children understand, what they enjoy, or whether they learn about shielding, delay, and budgeting. Hanna, Risden and Alexander (1997) and Markopoulos and Bekker (2003) both show that children use interfaces in ways adults do not predict. The protocol at the end of this document is the next step.

Severity uses Nielsen's 0–4 scale: 4 blocks play, 3 is a major problem for the target age, 2 is minor, 1 is cosmetic.

## Findings and fixes

| # | What a kid runs into | Sev. | Change | Main principle |
| --- | --- | --- | --- | --- |
| 1 | The goal arrow and object labels floated well above their objects, so it was unclear which crate they meant. | 3 | Arrows sit at 1.15 m, labels at 1.0 m, both close to the object. Arrows hide on the object B.E.E.P. is standing at. | Spatial contiguity (Mayer) |
| 2 | During a real choice (which cargo to pack, which workshop door), the guide pointed at the nearest option. Kids would follow the arrow without choosing. | 3 | On a choice, `nextGoal` returns `choice: true`. Both options get small arrows, there is no route of dots, and the E button gets no pointer. | Autonomy (SDT); avoiding "blind play" |
| 3 | **Back to the outpost** was the big orange button from the first second of the cargo bay, so one tap skipped packing. | 3 | It stays a plain button until the backpack is full. | Error prevention (Nielsen) |
| 4 | The E button offered "Pack X" for cargo that could no longer fit. Pressing it did nothing. | 2 | Cargo that won't fit is labelled "No room for the X · put something back" and is informational only. | Constraints (Norman) |
| 5 | Pressing E again on a chosen door or a sent message undoes it, but the button looked exactly like a new action. **Radio: cancel message** looked like the main thing to do. | 3 | Undo actions get a dashed outline and a rotate icon, and lose the pulse. | Signifiers (Norman); user control |
| 6 | At the shelter wall, tapping an empty square first (the natural move) did nothing. Kids could not see where the water tank would fit. | 3 | While carrying something, squares turn green (fits) or grey (doesn't). Tapping a square with empty hands shakes the shelf and B.E.E.P. says "First pick something from the **shelf** below." | Feedback, gulf of execution (Norman) |
| 7 | Jargon: "S1–S5", "ARCHIVE", "Protons >10 MeV · 1,493.5 pfu", "10 Sep 2017 15:35 UTC", "Contact window". | 3 | Cadet sees "Earth can hear us" with radio icons on shift numbers, "REAL NASA DATA", and one plain line such as "Particles: 150 times the warning level". Specialist keeps the real units. | Match with the real world (Nielsen); concrete operations (Piaget) |
| 8 | The food meter showed meals left, not the gap, so "the plates won't be full" had no picture. | 3 | Plates show meals still to eat. Missing meals are red dashed plates. | Gulf of evaluation (Norman) |
| 9 | B.E.E.P. disappeared behind the habitat and other buildings. | 3 | A raycast from B.E.E.P. to the camera raises the view when something blocks it. ⟲ ⟳ buttons, Q/Z and right-drag turn the view. | Visibility of system status |
| 10 | The **Walk to…** list opened behind the clue card. | 3 | The clue card hides while the list is open: one panel at a time. | Extraneous load (Sweller) |
| 11 | Nine buttons in the bottom bar, wrapping onto two rows. | 2 | Cadet has no Scan button (labels appear on approach; Space still works). Goggles show only in S3–S4. | Hick's law; minimalist design |
| 12 | Colour highlighting split item names ("**water** tank") and coloured common words ("air", "data", "window"). | 2 | Whole item names are one phrase. Fewer words are coloured, and numbers are bold only when they stand alone. | Signaling works only when sparse (Mayer) |
| 13 | The gesture close-up (pipe joint) was blocked by a crew member. | 2 | The camera and technician position were moved. | Visibility |
| 14 | Crew quotes and the "Next badge" line broke into fragments, because each word piece was a flex item. | 2 | Wrapped the text in one span. | Readability |
| 15 | Locked badges showed no way to earn them. | 2 | The debrief names one **Next badge to try** and how to get it. | Competence (SDT); goal clarity |
| 16 | The dose screen showed a developer note ("Real dose numbers from NASA CRaTER will be added"). | 1 | Cadet sees "Shorter bar = fewer particles = safer." | Coherence (Mayer) |
| 17 | The guide pointer on **Run shift** overlapped the status line above it. | 1 | The pointer comes from the left. | Visual clutter |
| 18 | The pipe and antenna dial buttons were about 30 px, too small for young fingers. | 2 | Raised to 56×48 px. | Fitts's law |
| 19 | The data panel's screen-reader name read the technical line while the screen showed the plain one. | 2 | The Cadet accessible name matches the visible text. | WCAG 2.5.3 Label in Name |
| 20 | Each shift's guess was asked cold. "Where will the air go when the pipe is straight?" comes before anything has said how air moves on the Moon, so a newcomer can only pick at random. S4 asked "Which bar will grow faster?" before any bar had been shown. (Found by the team, not the walkthrough.) | 3 | Every guess now opens with a **What you know** card: one short sentence and a diagram with the facts to reason from. The full sentence is spoken in Cadet. Each option has a "Pick this if you think…" hint, shown on mouse hover, keyboard focus, or the first tap. **That's my guess** confirms. | Prior knowledge (Ausubel); scaffolding |
| 21 | The first version of those cards, and the opening captions, were paragraphs. Too much reading for the age group (team feedback). Emoji strips came next and were rejected as decoration: they don't show how anything works. | 2 | Each card is one sentence over a diagram built from the game's own pieces (power meter cells, shelter grid with particle lines, food plates, the bent pipe between habitat and fan), labelled on the drawing and laid out like the world. Keywords share the diagram's colours. The opening and S1 put name tags on the 3D objects; later shifts drop them (fading scaffold). | Multimedia and spatial contiguity (Mayer); dual coding (Paivio) |

### Found during verification (robustness, not layout)

- **Retry 3D could never recover** (Sev. 4 when it happens). After any scene remount, React Three Fiber force-loses the old canvas's WebGL context about 500 ms later. Our `webglcontextlost` handler treated that as a crash and brought the error screen back over a working scene. It now ignores a context loss from a canvas that is no longer on the page. Asset and shader failures are also logged to the console instead of failing silently.
- **Development hot reload broke the 3D view.** This was dev only: the model cache is now kept across hot reloads.

## Why these choices: the theory behind them

### Cognitive load: cut what isn't the lesson

Sweller's cognitive load theory (1988) separates **intrinsic** load (the difficulty of the content), **extraneous** load (effort the presentation adds), and **germane** load (effort spent building understanding). MOONSHIFT's intrinsic load is set on purpose. Every item is used *or* walled, never both. The reply arrives one shift late. Food is short by one meal. These trade-offs are the lesson and stay.

Most fixes cut extraneous load: jargon (#7), a panel hiding a panel (#10), nine buttons (#11), a developer note (#16), split highlighting (#12). The clue card asks **one** question. The cargo clue no longer repeats the shield numbers, because the backpack's needs board already shows them.

Cadet and Specialist reflect the **expertise reversal effect** (Kalyuga et al., 2003): support that helps novices gets in the way of experienced players. The guide is always on for Cadet. For Specialist it appears only after the first hint.

### Multimedia learning: picture and word together

Mayer's principles (2009) map directly onto the changes:

- **Signaling**: colour-coded keywords (food green, power amber, shield teal, Earth blue, storm coral) only help when they are few, hence #12.
- **Spatial contiguity**: put the word next to the thing. Labels and arrows sit on their objects (#1). The shelter map's green squares show the placement where the decision happens (#6).
- **Coherence**: remove material the learner doesn't need (#16, Cadet data panel).
- **Segmenting**: one cutscene caption per shot, one cause-and-effect card per shift, three short debrief pages.
- **Pre-training**: the opening cutscene, the mission card and the needs board introduce the key parts (shield, meals, power, Earth) before the first decision.
- **Modality and personalization**: Cadet lines are read aloud, crew members have portraits and voices, and B.E.E.P. speaks in the first person.

One tension remains open. Cadet shows a caption *and* reads it aloud, which Mayer's redundancy principle warns against. For emerging readers aged 7–8, short on-screen text plus narration is a reasonable exception, because many of them cannot yet read the line fluently. Captions stay one line. Real testing should check whether the doubling distracts older children (see open issues).

### Norman: can I see what to do, and can I see what happened?

Norman (2013) describes two gulfs. The **gulf of execution** is figuring out what you can do. The **gulf of evaluation** is figuring out what happened.

- **Execution**: amber rings mark usable objects, the guide arrow and the glowing HUD button show the next step, and green squares show where an item fits (#6). These are **signifiers**: they show the action. Undo now has its own signifier, so a second press isn't an accident (#5).
- **Sound** adds a second feedback channel: a pop when packing, a thud when an item lands, a chime when a hand gesture works, a soft "boop" when a tap does nothing. Music shifts to a slower minor key during the flare and storm, so the mood changes without being frightening.
- **Evaluation**: before→after chips on result cards (Meals 4→3, Shield 0→4), the food gap (#8), the shield bar, and B.E.E.P.'s line when a tap does nothing (#6). The rule is that no tap should be silent.
- **Constraints**: impossible actions aren't offered (#4), and the route out of the cargo bay doesn't compete with packing (#3).

### Nielsen's heuristics

| Heuristic | Where it shows up |
| --- | --- |
| Visibility of system status | Food gap, shield bar, contact window, occlusion camera |
| Match with the real world | Plain Cadet wording, plates for meals, crates for shielding mass |
| User control and freedom | Undo by pressing E again, **Skip scene**, **Cancel** and **Do it for me** on gestures, **Change my plan** before running a short-food shift |
| Consistency | One button style per role: primary (orange), undo (dashed), info (no ring) |
| Error prevention | #3, #4, the warning before running a shift that misses a meal |
| Recognition over recall | Needs board in the backpack; the clue card shows both sides of a choice |
| Aesthetic and minimalist design | Trimmed bottom bar, one panel at a time |
| Help | Hint ladder on idle timers; **Ask crew** steps up at once |

### Hick and Fitts: fewer choices, bigger targets

**Hick's law** (Hick, 1952): decision time grows with the number of options. Cadet's bottom bar dropped from nine controls to six or fewer, and goggles appear only when the storm makes them useful.

**Fitts's law** (Fitts, 1954): small, distant targets are slow and error-prone. Children miss small touch targets far more often than adults (Anthony et al., 2012), so dial buttons now exceed 48 px (#18). WCAG 2.5.5 recommends 44×44 CSS px. The 32 px view-turn buttons are still below this and are listed as open.

### Fitting how 7–12-year-olds think

Most of the audience is in Piaget's **concrete operational** stage (about 7–11; Piaget & Inhelder, 1969). They reason well about things they can see and handle, and much less well about abstract units. The design gives each abstract idea a physical stand-in:

- Radiation shielding is crates and a water tank on a 3×3 grid. The goggles draw particle lines that stop at crates and pass through gaps.
- Communication delay is an envelope that arrives one shift later.
- Food budgeting is a row of plates with the missing ones drawn dashed.
- "1,493.5 pfu" becomes "150 times the warning level". The real numbers stay in Specialist mode for the 10–12-year-olds who are starting to reason abstractly.

**Scaffolding** (Wood, Bruner & Ross, 1976) inside the **zone of proximal development** (Vygotsky, 1978) should be contingent and should fade. MOONSHIFT does this with the hint ladder (level 0, 1 and 2 on idle timers of 15/30 s for Cadet and 25/45 s for Specialist), **Ask crew** on demand, and **Do it for me** for hand gestures a child can't manage. Help arrives when a child stalls and stays away when they are busy.

### Thinking before choosing (the "not blind play" goal)

The team asked that kids not "blindly play." Three mechanisms support this:

1. **Foundation, then predict, observe, explain.** Each shift opens with one guess that is never graded, followed by play and a cause-and-effect card with **Why?** This is the POE cycle from science education (White & Gunstone, 1992): a prediction gives the child a stake in the outcome. A prediction only means something if the child has something to reason *from*, though. Ausubel (1968) put it as "the most important single factor influencing learning is what the learner already knows." So every guess now starts with a **What you know** card (S1: "The Moon has no wind. A fan sits at one end of the pipe.", over a drawing of Earth vs Moon air and the habitat, bent joint and fan). The facts make the guess a short reasoning step instead of a coin flip, without stating the answer. Each option then explains itself ("Pick this if you think the fan can push air through a straight pipe"), so the child picks a *reason*, not a label. Choosing and confirming are separate steps. That gives touch players, who can't hover, the same hint before they commit, and it adds a small pause to think.
2. **Both sides, one question.** A clue card shows what each option does ("Use it: +2 meals" / "Save it: +1 shield cell") and ends with a question ("Which side is still open?"), never with the answer. Prompting children to explain to themselves improves understanding (Chi et al., 1994).
3. **No nudging on real choices** (#2). If the arrow picks for them, the decision belongs to the arrow.

Mistakes are safe. There is no game over. The weaker ending ("Rescue at Last") is gentle, names one thing to try next time, and offers a replay. Kapur's **productive failure** (2008) finds that struggling with a problem before being shown the answer can deepen understanding, provided the struggle is followed by consolidation. The debrief provides that: dose bars, one lesson, the branch map.

### Motivation

- **Self-determination theory** (Ryan & Deci, 2000). *Autonomy*: real choices with no hidden right answer pushed by the interface. *Competence*: badges, with one clearly named next goal (#15), and visible progress on the meters. *Relatedness*: the crew and B.E.E.P. as characters you protect.
- **Malone (1981).** *Challenge*: badge goals with uncertain outcomes. *Curiosity*: the goggles reveal something hidden. *Fantasy*: running a Moon outpost.
- **Intrinsic integration** (Habgood & Ainsworth, 2011): the learning content is the game mechanic. Building the wall *is* the shielding lesson, rather than a quiz bolted onto a game.
- **Gee (2003).** Information arrives *just in time* (a clue at the moment of choice, not a manual up front). Mission 1 is a simplified "fish tank" version of the full system. Replay with the branch map supports the probe → hypothesize → reprobe → rethink cycle.

## Still open

| Issue | Sev. | Suggested fix |
| --- | --- | --- |
| The crew hint bubble goes stale ("Look at the shelf" stays up after the kid has picked up the tank). | 2 | Clear or advance the hint when the goal it describes is reached. |
| The antenna dish in the world does not turn with the 2D dial. | 2 | Drive the dish rotation from the dial value so the action and its result appear together. |
| Power meter lock icons are hard to read. | 2 | Label them ("air") or use an air icon. |
| The ⟲ ⟳ view-turn buttons in the bottom bar are 32 px. | 2 | Raise to 44 px or more. |
| The bottom bar still wraps at 1280×720 in S4 (**Walk to…** drops to a second row). | 1 | Drop button labels to icons with tooltips at that width, or move **Walk to…** into the pause menu for Cadet. |
| No feedback animation when an item is packed. | 1 | A short hop into the backpack. |
| No two-finger rotate on touch. | 1 | Optional; the buttons cover it. |
| The guide route is a straight line and can cross buildings. | 1 | Acceptable for now; use the walk path if kids follow the dots literally. |
| Cadet reads captions aloud while showing them (redundancy). | ? | Measure in testing. If it distracts older readers, make read-aloud opt-in above age 9. |

## Testing with real children

The walkthrough above can't stand in for this. A small formative study:

- **Participants.** 5–8 children per band (7–9 Cadet, 10–12 Specialist), with parental consent. In line with the GDD, record no names or exact ages, only the band.
- **Format.** Pairs rather than solo think-aloud. Young children find thinking aloud alone difficult, and talking with a partner (constructive interaction) produces more natural talk (Markopoulos & Bekker, 2003; Hanna et al., 1997). Keep sessions under 30 minutes. The facilitator doesn't help unless a pair is stuck for more than a minute.
- **Observe.** Time to first correct action per shift, taps that did nothing, hint level reached, **Do it for me** use, and whether children read the clue card before choosing.
- **Ask.** After each major choice: "Why did you pick that one?" After the run: three questions on the learning goals (what blocks particles, why Earth's answer came late, why the plates weren't full).
- **Enjoyment.** The Fun Toolkit's Smileyometer and Again-Again table (Read & MacFarlane, 2006).
- **Decide.** Fix anything that stops two or more pairs. Re-test the changed shifts only.

## References

- Anthony, L., Brown, Q., Nias, J., Tate, B., & Mohan, S. (2012). Interaction and recognition challenges in interpreting children's touch and gesture input on mobile devices. *ITS '12*, 225–234.
- Ausubel, D. P. (1968). *Educational psychology: A cognitive view*. Holt, Rinehart and Winston.
- Chi, M. T. H., de Leeuw, N., Chiu, M.-H., & LaVancher, C. (1994). Eliciting self-explanations improves understanding. *Cognitive Science, 18*(3), 439–477.
- Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement. *Journal of Experimental Psychology, 47*(6), 381–391.
- Gee, J. P. (2003). *What video games have to teach us about learning and literacy*. Palgrave Macmillan.
- Habgood, M. P. J., & Ainsworth, S. E. (2011). Motivating children to learn effectively: Exploring the value of intrinsic integration in educational games. *Journal of the Learning Sciences, 20*(2), 169–206.
- Hanna, L., Risden, K., & Alexander, K. (1997). Guidelines for usability testing with children. *interactions, 4*(5), 9–14.
- Hick, W. E. (1952). On the rate of gain of information. *Quarterly Journal of Experimental Psychology, 4*(1), 11–26.
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. *Educational Psychologist, 38*(1), 23–31.
- Kapur, M. (2008). Productive failure. *Cognition and Instruction, 26*(3), 379–424.
- Malone, T. W. (1981). Toward a theory of intrinsically motivating instruction. *Cognitive Science, 5*(4), 333–369.
- Markopoulos, P., & Bekker, M. (2003). On the assessment of usability testing methods for children. *Interacting with Computers, 15*(2), 227–243.
- Mayer, R. E. (2009). *Multimedia learning* (2nd ed.). Cambridge University Press.
- Nielsen, J. (1994). Enhancing the explanatory power of usability heuristics. *CHI '94*, 152–158.
- Norman, D. A. (2013). *The design of everyday things* (Revised and expanded ed.). Basic Books.
- Paivio, A. (1986). *Mental representations: A dual coding approach*. Oxford University Press.
- Piaget, J., & Inhelder, B. (1969). *The psychology of the child*. Basic Books.
- Read, J. C., & MacFarlane, S. (2006). Using the Fun Toolkit and other survey methods to gather opinions in child computer interaction. *IDC '06*, 81–88.
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist, 55*(1), 68–78.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science, 12*(2), 257–285.
- Vygotsky, L. S. (1978). *Mind in society*. Harvard University Press.
- White, R., & Gunstone, R. (1992). *Probing understanding*. Falmer Press.
- Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. *Journal of Child Psychology and Psychiatry, 17*(2), 89–100.
