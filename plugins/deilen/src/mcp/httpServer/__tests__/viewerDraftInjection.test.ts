import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { getHttpServer } from "../httpServer.js";

const VIEWER_HTML = `<!doctype html><html data-theme="auto"><head><title>t</title></head><body><script>window.__DEILEN_STATE__="__DEILEN_STATE__";</script><div id="viewer"></div></body></html>`;
const STATE_PATTERN = /__DEILEN_STATE__=(.+?);<\/script>/;

function sessionIdFrom(url: string): string {
  return new URL(url).pathname.replace("/r/", "");
}

function stateOf(html: string): { draft: unknown; session_ttl_hours: number } {
  const match = STATE_PATTERN.exec(html);
  if (!match) throw new Error("state not injected");
  return JSON.parse(match[1]) as {
    draft: unknown;
    session_ttl_hours: number;
  };
}

beforeAll(async () => {
  const pluginRoot = mkdtempSync(join(tmpdir(), "deilen-public-"));
  mkdirSync(join(pluginRoot, "public", "assets"), { recursive: true });
  writeFileSync(join(pluginRoot, "public", "viewer.html"), VIEWER_HTML);
  writeFileSync(
    join(pluginRoot, "public", "assets", "highlight.js"),
    "export function highlightAll(){}",
  );
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
});

afterAll(async () => {
  await getHttpServer()?.close();
});

describe("viewer draft injection", () => {
  it("injects the in_progress autosave as state.draft", async () => {
    const out = await handleRenderViewer({ content: "# Draft\n\nline two" });
    const sid = sessionIdFrom(out.url);
    const url = new URL(out.url);
    const token = url.searchParams.get("token") ?? "";
    const save = await fetch(
      `${url.origin}/api/feedback?session=${sid}&token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          status: "in_progress",
          intent: "revise",
          overall: [{ id: "o1", text: "overall note", imageIds: [] }],
          comments: [
            {
              id: "c1",
              anchor: { startLine: 3, endLine: 3, sourceText: "line two" },
              text: "fix this",
              imageIds: [],
            },
          ],
        }),
      },
    );
    expect(save.status).toBe(200);

    const state = stateOf(await (await fetch(out.url)).text());
    expect(state.session_ttl_hours).toBe(72);
    expect(state.draft).toMatchObject({
      overall: [{ id: "o1", text: "overall note" }],
      comments: [{ id: "c1", text: "fix this", anchor: { startLine: 3 } }],
    });
  });

  it("injects draft: null when nothing was autosaved", async () => {
    const out = await handleRenderViewer({ content: "# Empty" });
    const state = stateOf(await (await fetch(out.url)).text());
    expect(state.draft).toBeNull();
  });
});
