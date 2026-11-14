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
  test.setTimeout(480000); // headless software GL is slow; real browsers finish far sooner
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
  // Debrief page 1: dose bars scaled to Artemis I, and the real DONKI event chain.
  await expect(page.getByLabel("What really happened")).toContainText("16:45");
  await expect(page.getByText(/Artemis I/)).toBeVisible();
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByText(/water tank/)).toBeVisible();
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByText("Moon Scientist")).toBeVisible();
  await page.getByRole("button", { name: /Replay from shift 1/ }).click();
  await expect(page.getByText("SHIFT 1 OF 5")).toBeVisible();
  expect(errors).toEqual([]);
});
