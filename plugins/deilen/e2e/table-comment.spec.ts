import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import type { handleRenderViewer as HandleRenderViewer } from "../src/mcp/tools/renderViewer/renderViewer.js";
import type { getHttpServer as GetHttpServer } from "../src/mcp/httpServer/httpServer.js";
import type { atomicWrite as AtomicWrite } from "../src/lib/atomicWrite.js";

let handleRenderViewer: typeof HandleRenderViewer;
let getHttpServer: typeof GetHttpServer;
let atomicWrite: typeof AtomicWrite;
let CONFIG_PATH: string;

async function loadRuntime(): Promise<void> {
  const testHome = mkdtempSync(join(tmpdir(), "deilen-e2e-tbl-"));
  process.env.CLAUDE_CONFIG_DIR = testHome;
  process.env.HOME = testHome;
  process.env.USERPROFILE = testHome;
  process.env.OGHAM_NO_BROWSER = "1";

  [
    { handleRenderViewer },
    { getHttpServer },
    { atomicWrite },
    { CONFIG_PATH },
  ] = await Promise.all([
    import("../src/mcp/tools/renderViewer/renderViewer.js"),
    import("../src/mcp/httpServer/httpServer.js"),
    import("../src/lib/atomicWrite.js"),
    import("../src/constants/paths.js"),
  ]);

  await atomicWrite(
    CONFIG_PATH,
    JSON.stringify({
      auto_open: false,
      renderers: { mermaid: false, highlight: false, math: false },
    }),
  );
}

test.beforeAll(loadRuntime);
test.afterAll(async () => {
  await getHttpServer()?.close();
});

const DOC = `# Table highlight

| Name | Role |
| ----- | ---- |
| Alice | Dev |
| Bob | PM |
`;

test("commenting a table row highlights that row's cells", async ({ page }) => {
  const rendered = await handleRenderViewer({ content: DOC });
  await page.goto(rendered.url);
  await expect(
    page.getByRole("heading", { name: "Table highlight" }),
  ).toBeVisible();

  // The server stamps each row with a source line; the cells carry none, so a
  // row is the finest anchorable unit.
  await expect(
    page.locator("#viewer tbody tr[data-source-line]").first(),
  ).toBeAttached();
  expect(await page.locator("#viewer td[data-source-line]").count()).toBe(0);

  // Select the first body row's cell text, as a user dragging across it would.
  await page.evaluate(() => {
    const cell = document.querySelector("#viewer tbody tr td");
    if (!cell) throw new Error("no table cell");
    const range = document.createRange();
    range.selectNodeContents(cell);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  // The popover's "Comment" opens the composer and the pending flag lands on
  // the row (not the table), washing its cells.
  await page.locator(".sel-popover button").click();
  await expect(
    page.locator('#viewer tbody tr[data-pending-comment="true"]'),
  ).toBeAttached();

  await page.locator(".composer textarea").fill("Check Alice.");
  await page.locator(".composer .btn-primary").click();

  // Committed: exactly the selected row carries the comment flag and its cells
  // render a non-transparent wash.
  const row = page.locator('#viewer tbody tr[data-has-comment="true"]');
  await expect(row).toHaveCount(1);
  const cellBackground = await row
    .locator("td")
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(cellBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(cellBackground).not.toBe("transparent");
});
