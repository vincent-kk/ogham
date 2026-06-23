import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { handleCollectFeedback as HandleCollectFeedback } from "../src/mcp/tools/collectFeedback/collectFeedback.js";
import type { handleRenderViewer as HandleRenderViewer } from "../src/mcp/tools/renderViewer/renderViewer.js";
import type { atomicWrite as AtomicWrite } from "../src/lib/atomicWrite.js";
import type { getHttpServer as GetHttpServer } from "../src/mcp/httpServer/httpServer.js";
import type { ToolExtra } from "../src/mcp/shared/index.js";

let handleRenderViewer: typeof HandleRenderViewer;
let handleCollectFeedback: typeof HandleCollectFeedback;
let getHttpServer: typeof GetHttpServer;
let atomicWrite: typeof AtomicWrite;
let CONFIG_PATH: string;

async function loadRuntime(): Promise<void> {
  const testHome = mkdtempSync(join(tmpdir(), "deilen-e2e-"));
  process.env.CLAUDE_CONFIG_DIR = testHome;
  process.env.HOME = testHome;
  process.env.USERPROFILE = testHome;
  process.env.DEILEN_NO_BROWSER = "1";

  [
    { handleRenderViewer },
    { handleCollectFeedback },
    { getHttpServer },
    { atomicWrite },
    { CONFIG_PATH },
  ] = await Promise.all([
    import("../src/mcp/tools/renderViewer/renderViewer.js"),
    import("../src/mcp/tools/collectFeedback/collectFeedback.js"),
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

async function addOverallNote(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: "+ Overall note" }).click();
  await page.locator("textarea").fill(text);
  await page.getByRole("button", { name: "Save" }).click();
}

test.beforeAll(async () => {
  await loadRuntime();
});

test.afterAll(async () => {
  await getHttpServer()?.close();
});

test("preserves the viewer after submit is collected and refresh disables submit", async ({
  page,
}) => {
  const rendered = await handleRenderViewer({
    content: "# Refresh survives\n\nBody paragraph.",
  });
  const extra = {
    signal: new AbortController().signal,
  } as unknown as ToolExtra;
  const collecting = handleCollectFeedback(
    { session_id: rendered.session_id, wait_seconds: 5 },
    extra,
  );

  await page.goto(rendered.url);
  await expect(
    page.getByRole("heading", { name: "Refresh survives" }),
  ).toBeVisible();
  await addOverallNote(page, "Keep the rendered document visible after submit.");

  const submit = page.getByRole("button", { name: "Submit feedback" });
  await expect(submit).toBeEnabled();
  await submit.click();

  const result = await collecting;
  expect("content" in result).toBe(true);
  if ("content" in result) {
    const text = result.content.find((item) => item.type === "text");
    expect(text && "text" in text ? text.text : "").toContain(
      "Keep the rendered document visible after submit.",
    );
  }

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Refresh survives" }),
  ).toBeVisible();
  await expect(page.getByText("Body paragraph.")).toBeVisible();
  await expect(page.getByText("This session has ended")).toBeVisible();
  await expect(submit).toBeDisabled();
});
