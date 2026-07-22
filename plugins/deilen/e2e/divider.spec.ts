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
  const testHome = mkdtempSync(join(tmpdir(), "deilen-e2e-hr-"));
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

const DOC = `# Divider

above

---

below
`;

test("hr renders the debossed divider ornament from live tokens", async ({
  page,
}) => {
  const rendered = await handleRenderViewer({ content: DOC });
  await page.goto(rendered.url);
  await expect(page.getByRole("heading", { name: "Divider" })).toBeVisible();

  const hr = page.locator("#viewer hr");
  await expect(hr).toBeAttached();

  const styles = await hr.evaluate((element) => {
    const after = getComputedStyle(element, "::after");
    const before = getComputedStyle(element, "::before");
    const box = element.getBoundingClientRect();
    return {
      afterContent: after.content,
      afterMask: after.maskImage || after.webkitMaskImage,
      afterBackground: after.backgroundColor,
      beforeBackground: before.backgroundColor,
      beforeTransform: before.transform,
      width: box.width,
      height: box.height,
    };
  });

  // Both pseudo-element layers must resolve their token colors — a missing
  // --divider/--divider-edge collapses the background to transparent.
  expect(styles.afterContent).toBe('""');
  for (const color of [styles.afterBackground, styles.beforeBackground]) {
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
    expect(color).not.toBe("transparent");
  }
  // Fill and edge are distinct layers, and the edge sits 1px lower (deboss).
  expect(styles.beforeBackground).not.toBe(styles.afterBackground);
  expect(styles.beforeTransform).toBe("matrix(1, 0, 0, 1, 0, 1)");

  // The divider mask must decode to well-formed inline SVG — a mangled data
  // URI keeps a url() computed value while silently rendering nothing.
  const dataUri = /url\("?(data:image\/svg\+xml,[^")]+)"?\)/.exec(
    styles.afterMask,
  )?.[1];
  if (!dataUri) throw new Error(`mask is not a data URI: ${styles.afterMask}`);
  const svg = decodeURIComponent(dataUri.slice("data:image/svg+xml,".length));
  expect(svg.startsWith("<svg")).toBe(true);
  expect(svg.endsWith("</svg>")).toBe(true);
  expect(svg).toContain("<path");

  // Fixed ornament footprint, centered by margin auto.
  expect(styles.width).toBe(132);
  expect(styles.height).toBe(13);
});
