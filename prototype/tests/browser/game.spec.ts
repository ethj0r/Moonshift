import { expect, test, type Page } from "@playwright/test";

// Walk B.E.E.P. to an object through the "Walk to…" list; arriving uses it.
async function walkTo(page: Page, label: string | RegExp) {
  await page.getByRole("button", { name: "Walk to…" }).click();
  await page.getByRole("button", { name: label }).click();
}
// Cutscenes (opening, flare, storm, rescue) can be skipped.
async function skipScene(page: Page) {
  const skip = page.getByRole("button", { name: /Skip scene/ });
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
}
async function brief(page: Page, answer: string, seen: string[] = []) {
  const next = page.getByRole("button", { name: /^Next/ });
  await expect(next.or(page.getByRole("button", { name: /Skip scene/ }))).toBeVisible({ timeout: 10000 });
  await skipScene(page);
  await next.waitFor({ timeout: 10000 });
  let text = "";
  while (await next.isVisible().catch(() => false)) {
    text += await page.locator("body").innerText();
    await next.click();
  }
  // Lines that must appear somewhere in this brief (e.g. NASA data in Earth's reply).
  for (const s of seen) expect(text).toContain(s);
  // Scaffolded guess: facts shown first; choosing explains the option before it is confirmed.
  await expect(page.getByText("What you know")).toBeVisible();
  await expect(page.locator(".know-art")).toBeVisible();
  const confirm = page.getByRole("button", { name: "That's my guess" });
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: answer, exact: true }).click();
  await expect(page.locator(".guess-hint")).toContainText(answer);
  await confirm.click();
  await page.getByRole("button", { name: /Let's go|Open the cargo bay/ }).click();
}
async function runShift(page: Page, nextLabel: string | RegExp) {
  await expect(page.getByRole("button", { name: /Run shift|Back to the outpost/ })).toBeEnabled({ timeout: 10000 });
  await page.getByRole("button", { name: /Run shift|Back to the outpost/ }).click();
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await page.getByRole("button", { name: nextLabel }).click();
}
async function turn(page: Page, times: number) {
  for (let i = 0; i < times; i++) await page.getByRole("button", { name: "Turn left" }).click();
}

test("Mission 1 by walking and hands-on actions ends Safe and Sound", async ({ page }) => {
  test.setTimeout(900000); // headless software GL is slow; real browsers finish far sooner
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Headless GL is slow; keep frames cheap so walking stays quick.
  await page.addInitScript(() =>
    localStorage.setItem("moonshift-preferences", JSON.stringify({ lowGraphics: true, reducedMotion: true, voice: false })),
  );
  await page.goto("/?diagnostics");
  await expect(page.getByRole("button", { name: /Mission 1/ })).toBeEnabled({ timeout: 25000 });
  // Judges and kids see that the story is made up but the data is real.
  await expect(page.getByText(/Made-up story, real science/)).toBeVisible();
  await page.getByRole("button", { name: /Mission 1/ }).click();

  // Prologue: a new player first learns where they are and who they are, before any choice.
  await expect(page.getByText(/The Moon's south pole/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/This little robot is you/)).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".world-label", { hasText: "You: B.E.E.P." })).toBeVisible();

  // Opening: pack Kit + Research + Battery (GDD v2 §10).
  await brief(page, "Food pack");
  for (const item of [/Pack Garden kit/, /Pack Research crate/, /Pack Spare battery/]) {
    await walkTo(page, item);
    await expect(page.getByRole("button", { name: item })).toHaveCount(0, { timeout: 10000 });
  }
  await expect(page.getByLabel("Backpack")).toContainText("4/4");
  await runShift(page, "Start shift 1");

  // S1: turn the pipe joint by hand.
  await brief(page, "Into the habitat");
  // First shift: a short spotlight tour of the HUD (rescue track, power, food, shield).
  await expect(page.getByText(/it comes after shift 5/)).toBeVisible({ timeout: 10000 });
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog", { name: "What the panels show" })).toHaveCount(0);
  await walkTo(page, "Turn the pipe");
  await expect(page.getByRole("button", { name: "Do it for me" })).toHaveCount(0);
  await turn(page, 9);
  await expect(page.getByRole("button", { name: /Run shift/ })).toBeEnabled({ timeout: 5000 });
  await runShift(page, "Start shift 2");
  // Result cards: no repeated "ate one meal" line, and a crew member reacts.
  await expect(page.getByText("The crew ate one meal.")).toHaveCount(0);

  // S2: keep the workshop, point the antenna and ask Earth.
  await brief(page, "Garden lamp");
  // One workshop point, two decisions.
  await walkTo(page, /Workshop: keep it or take it apart/);
  await page.getByRole("button", { name: /Keep it/ }).click();
  await expect(page.getByText(/Choose: keep the workshop/)).toHaveCount(0, { timeout: 15000 });
  await walkTo(page, /Radio Earth/);
  await turn(page, 9);
  await page.getByRole("button", { name: /Send · 1 power/ }).click();
  await expect(page.getByText("1 message: reply next shift")).toBeVisible();
  await runShift(page, "Start shift 3");

  // S3: Earth's reply makes the water tank movable; build the wall.
  // Earth's reply quotes the real NASA DONKI measurement and forecast of the 10 Sep 2017 cloud.
  await brief(page, "A1", ["2,650 km every second", "predicts"]);
  await expect(page.getByText("Reply from Earth arrived")).toBeVisible();
  // DONKI timing: the flare at 15:35 UTC, particles at 16:45 UTC.
  await expect(page.getByText("A giant flare. Particles came 70 minutes later.")).toBeVisible();
  // In-world markers on the things driven by real data.
  await expect(page.locator(".world-label", { hasText: "NASA forecast" })).toHaveCount(1); // on the radio, may be off-camera
  await expect(page.locator(".world-label", { hasText: "Real NASA data" })).toBeVisible();
  const map = page.getByLabel("Shelter map");
  await map.getByRole("button", { name: "Supply crate", exact: true }).first().click();
  await map.getByRole("button", { name: /^A1:/ }).click();
  await map.getByRole("button", { name: "Supply crate", exact: true }).first().click();
  await map.getByRole("button", { name: /^A3:/ }).click();
  await map.getByRole("button", { name: "Water tank", exact: true }).click();
  await map.getByRole("button", { name: /Turn tank/ }).click();
  await map.getByRole("button", { name: /^B1:/ }).click();
  await expect(page.getByLabel(/Shield: 4 of 8/)).toBeVisible();
  await walkTo(page, /Care for the garden/);
  await runShift(page, "Start shift 4");

  // S4: move the crew, battery, sample lamp, harvest by hand.
  await brief(page, "Habitat");
  await page.getByRole("button", { name: "Move crew" }).click();
  await page.getByRole("button", { name: "+1 battery" }).click();
  await walkTo(page, /Sample lamp on/);
  await walkTo(page, /Harvest the garden/);
  for (let i = 1; i <= 3; i++) await page.getByRole("button", { name: `Pick pot ${i}` }).click();
  await runShift(page, "Start shift 5");

  // S5: send the research.
  await brief(page, "Yes");
  await walkTo(page, /Send research to Earth/);
  await turn(page, 9);
  await page.getByRole("button", { name: /Send · 1 power/ }).click();
  await runShift(page, "Wait for the rescue lander");
  await expect(page.getByRole("button", { name: /Skip scene/ })).toBeVisible();
  await skipScene(page);

  await expect(page.getByRole("heading", { name: "Safe and Sound!" })).toBeVisible();
  await expect(page.getByText("Earth: data received!")).toBeVisible();
  await page.getByRole("button", { name: "Debrief" }).click();
  // Mission report 1/3: the crew check, with this run's ending lit next to the other one.
  await expect(page.getByRole("button", { name: /Crew check/ })).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "Safe and Sound" })).toBeVisible();
  await expect(page.getByText("Everyone was shielded from the storm and ate every meal.")).toBeVisible();
  await expect(page.getByText("Your ending")).toBeVisible();
  // 2/3: the chain of choices; nothing went wrong, so no step is blamed.
  await page.getByRole("button", { name: /Why did this happen/ }).click();
  await expect(page.getByText(/heavy water tank could join the wall/)).toBeVisible();
  await expect(page.getByText("Changed the ending")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Every choice paid off" })).toBeVisible();
  // 3/3: dose bars scaled to Artemis I, the real DONKI event chain, badges.
  await page.getByRole("button", { name: /What did we learn/ }).click();
  await expect(page.getByLabel("What really happened")).toContainText("16:45");
  await expect(page.getByText(/Artemis I/)).toBeVisible();
  await expect(page.getByText("Moon Scientist")).toBeVisible();
  // The decision tree shows this run's path and the branches still hidden.
  await page.getByRole("button", { name: /Decision tree/ }).click();
  await expect(page.getByRole("heading", { name: "Every path to the end" })).toBeVisible();
  await expect(page.getByText("★ Your choice this run")).toBeVisible();
  await expect(page.getByRole("button", { name: "Not found yet" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Close decision tree" }).click();
  await page.getByRole("button", { name: /Replay from shift 1/ }).click();
  await expect(page.getByText("SHIFT 1 OF 5")).toBeVisible();
  expect(errors).toEqual([]);
});
