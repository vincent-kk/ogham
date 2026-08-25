// filid:contract AC-viewer-draft-restore
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { handleRenderViewer as HandleRenderViewer } from "../src/mcp/tools/renderViewer/renderViewer.js";
import type { atomicWrite as AtomicWrite } from "../src/lib/atomicWrite.js";
import type { getHttpServer as GetHttpServer } from "../src/mcp/httpServer/httpServer.js";

let handleRenderViewer: typeof HandleRenderViewer;
let getHttpServer: typeof GetHttpServer;
let atomicWrite: typeof AtomicWrite;
let CONFIG_PATH: string;

const LINKED_DOCUMENT =
  "# Restore me\n\nBody line.\n\nSee [docs](https://example.com/docs).";

async function loadRuntime(): Promise<void> {
  const testHome = mkdtempSync(join(tmpdir(), "deilen-e2e-"));
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

test("restores unsent comments after reload", async ({ page }) => {
  const rendered = await handleRenderViewer({ content: LINKED_DOCUMENT });

  await page.goto(rendered.url);
  await expect(page.getByRole("heading", { name: "Restore me" })).toBeVisible();
  await addOverallNote(page, "Unsent overall note");
  await expect(page.getByText("Unsent overall note")).toBeVisible();

  // The unsent draft arms the beforeunload guard; an unhandled dialog would be
  // dismissed by Playwright, which cancels the reload.
  page.on("dialog", (dialog) => void dialog.accept());
  await page.reload();

  await expect(page.getByRole("heading", { name: "Restore me" })).toBeVisible();
  await expect(page.getByText("Unsent overall note")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue in chat" }),
  ).toBeEnabled();
});

test("shows the server's in_progress draft on a fresh browser", async ({
  page,
}) => {
  const rendered = await handleRenderViewer({
    content: "# Server draft\n\nSecond line.",
  });
  const url = new URL(rendered.url);
  const token = url.searchParams.get("token") ?? "";

  const saved = await page.request.post(
    `${url.origin}/api/feedback?session=${rendered.session_id}&token=${token}`,
    {
      data: {
        session_id: rendered.session_id,
        status: "in_progress",
        intent: "revise",
        overall: [{ id: "o1", text: "Server-held note", imageIds: [] }],
        comments: [],
      },
    },
  );
  expect(saved.status()).toBe(200);

  await page.goto(rendered.url);
  await expect(
    page.getByRole("heading", { name: "Server draft" }),
  ).toBeVisible();
  await expect(page.getByText("Server-held note")).toBeVisible();
});

test("opens document links in a new tab", async ({ page }) => {
  const rendered = await handleRenderViewer({ content: LINKED_DOCUMENT });

  await page.goto(rendered.url);
  const link = page.locator('#viewer a[href="https://example.com/docs"]');
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});
