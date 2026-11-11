import { expect, test, type Page } from "@playwright/test";
import { OrthographicCamera, Vector3 } from "three";

async function start(page: Page) {
  await page.goto("/?diagnostics");
  await expect(page.getByRole("button", { name: "Start shift 3" })).toBeEnabled(
    { timeout: 25000 },
  );
  await page.getByRole("button", { name: "Start shift 3" }).click();
  await page.getByRole("button", { name: "Begin", exact: true }).click();
}
async function store(page: Page) {
  await page.getByRole("button", { name: "Select research crate" }).click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page.locator('[data-cell="0"]').click();
  await page
    .getByRole("button", { name: "Select battery", exact: true })
    .click();
  await page.locator('[data-cell="6"]').click();
  await expect(page.getByRole("button", { name: "Run shift 3" })).toBeEnabled();
  await page.getByRole("button", { name: "Run shift 3" }).click();
  await page.getByRole("button", { name: "Skip feedback" }).click();
  await page.getByRole("button", { name: "Continue to shift 4" }).click();
}

test("complete a crew-safe plan, send research, and replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  await store(page);
  await page.getByRole("button", { name: /Top route/ }).click();
  await page.getByRole("button", { name: /Power the fan/ }).click();
  await page.getByRole("button", { name: /Move crew to shelter/ }).click();
  await page.getByRole("button", { name: /Use spare battery/ }).click();
  await page.getByRole("button", { name: "Garden", exact: true }).click();
  await page.getByRole("button", { name: /Care for garden/ }).click();
  await page.getByRole("button", { name: "Run shift 4" }).click();
  await page.getByRole("button", { name: "Skip feedback" }).click();
  await expect(
    page.getByRole("heading", { name: "All three, safely inside." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to shift 5" }).click();
  await expect(page.getByTestId("food-count")).toHaveText("3");
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page.getByRole("button", { name: /Prepare research/ }).click();
  await page.getByRole("button", { name: "Radio", exact: true }).click();
  await page.getByRole("button", { name: /Power the radio/ }).click();
  await page.getByRole("radio", { name: "Research results" }).check();
  await page.getByRole("button", { name: "Run shift 5" }).click();
  await page.getByRole("button", { name: "Skip feedback" }).click();
  await page.getByRole("button", { name: "See mission summary" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready for the final shift." }),
  ).toBeVisible();
  await expect(page.getByText("Sent!", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Try another plan" }).click();
  await expect(page.getByTestId("food-count")).toHaveText("3");
  await expect(
    page.getByRole("button", { name: "Run shift 3" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("menus preserve focus and reduced motion, with responsive layout", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: /Reduced motion/ }).check();
  await page.getByRole("checkbox", { name: /Low graphics/ }).check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause game" })).toBeFocused();
  await page.getByRole("button", { name: "Select research crate" }).click();
  await page.locator('[data-cell="0"]').focus();
  await page.keyboard.press("r");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-cell="3"]')).toHaveAttribute(
    "aria-label",
    /Research crate/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("unsafe protection needs confirmation and records the crew outcome", async ({
  page,
}) => {
  await start(page);
  await store(page);
  await page.getByRole("button", { name: /Top route/ }).click();
  await page.getByRole("button", { name: /Power the fan/ }).click();
  await page.getByRole("button", { name: "Run shift 4" }).click();
  await expect(
    page.getByRole("heading", { name: "Continue without shelter?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to plan", exact: true })
    .click();
  await expect(page.getByTestId("food-count")).toHaveText("2");
  await page.getByRole("button", { name: "Run shift 4" }).click();
  await page
    .getByRole("button", { name: "Continue without shelter", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip feedback" }).click();
  await expect(
    page.getByText("The crew did not shelter during the storm.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("the 3D board dispatches the same placements as the accessible grid", async ({
  page,
}) => {
  await start(page);
  async function clickCell(cell: number) {
    const canvas = page.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const narrow = box.width < 761;
    const height = Math.max(
      narrow ? 8.5 : 11,
      (narrow ? 10.7 : 19) / (box.width / box.height),
    );
    const camera = new OrthographicCamera(
      (-height * box.width) / box.height / 2,
      (height * box.width) / box.height / 2,
      height / 2,
      -height / 2,
      0.1,
      100,
    );
    const target = new Vector3(narrow ? 0.8 : -0.4, 0.3, narrow ? 2.2 : 1.1);
    camera.position.copy(target).add(new Vector3(15, 18, 15));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const point = new Vector3(
      1.15 + ((cell % 3) - 1) * 1.05,
      0.415,
      3.1 + (Math.floor(cell / 3) - 1) * 1.05,
    ).project(camera);
    await page.mouse.click(
      box.x + ((point.x + 1) * box.width) / 2,
      box.y + ((-point.y + 1) * box.height) / 2,
    );
  }
  await page.getByRole("button", { name: "Select research crate" }).click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await clickCell(0);
  await expect(page.locator('[data-cell="0"]')).toHaveAttribute(
    "aria-label",
    /Research crate/,
  );
  await expect(page.locator('[data-cell="3"]')).toHaveAttribute(
    "aria-label",
    /Research crate/,
  );
  await page
    .getByRole("button", { name: "Select battery", exact: true })
    .click();
  await clickCell(6);
  await expect(page.getByRole("button", { name: "Run shift 3" })).toBeEnabled();
});

test("recovers from an asset failure and remains usable without downloaded fonts", async ({
  page,
}) => {
  let failed = false;
  await page.route("**/*.woff2", (route) => route.abort());
  await page.route("**/models/research.glb", (route) => {
    if (!failed) {
      failed = true;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Retry 3D" })).toBeVisible();
  await page.getByRole("button", { name: "Retry 3D" }).click();
  await expect(page.getByRole("button", { name: "Start shift 3" })).toBeEnabled(
    { timeout: 25000 },
  );
  await page.getByRole("button", { name: "Start shift 3" }).click();
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await store(page);
  await expect(page.getByTestId("food-count")).toHaveText("2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
