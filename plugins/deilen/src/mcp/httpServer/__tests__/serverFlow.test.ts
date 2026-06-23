import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { getHttpServer } from "../httpServer.js";

const VIEWER_HTML = `<!doctype html><html data-theme="auto"><head><title>t</title></head><body><script>window.__DEILEN_STATE__="__DEILEN_STATE__";</script><div id="viewer"></div></body></html>`;

let baseUrl = "";
let token = "";

function sessionIdFrom(url: string): string {
  return new URL(url).pathname.replace("/r/", "");
}

beforeAll(async () => {
  const pluginRoot = mkdtempSync(join(tmpdir(), "deilen-bridge-"));
  mkdirSync(join(pluginRoot, "bridge", "assets"), { recursive: true });
  writeFileSync(join(pluginRoot, "bridge", "viewer.html"), VIEWER_HTML);
  writeFileSync(
    join(pluginRoot, "bridge", "assets", "highlight.js"),
    "export function highlightAll(){}",
  );
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
});

afterAll(async () => {
  await getHttpServer()?.close();
});

describe("viewer server flow", () => {
  it("serves a rendered viewer with injected, escaped state", async () => {
    const out = await handleRenderViewer({
      content: "# Hello\n\nA paragraph.",
    });
    expect(out.status).toBe("serving");
    const url = new URL(out.url);
    token = url.searchParams.get("token") ?? "";
    baseUrl = url.origin;

    const res = await fetch(out.url);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Hello");
    expect(html).not.toContain('"__DEILEN_STATE__"');
    expect(html).toContain("data-source-line");
  });

  it("rejects an invalid token with 401", async () => {
    const res = await fetch(`${baseUrl}/r/rs_whatever?token=bad`);
    expect(res.status).toBe(401);
  });

  it("returns viewer data as JSON", async () => {
    const out = await handleRenderViewer({ content: "## Section\n\ntext" });
    const sid = sessionIdFrom(out.url);
    const res = await fetch(
      `${baseUrl}/api/viewer?session=${sid}&token=${token}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; html: string };
    expect(body.ok).toBe(true);
    expect(body.html).toContain("Section");
  });

  it("returns raw markdown with format=md", async () => {
    const out = await handleRenderViewer({ content: "raw *body* text" });
    const sid = sessionIdFrom(out.url);
    const res = await fetch(
      `${baseUrl}/api/viewer?session=${sid}&token=${token}&format=md`,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("raw *body* text");
  });

  it("serves a known asset without a token and 404s an unknown one", async () => {
    const ok = await fetch(`${baseUrl}/assets/highlight.js`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("javascript");
    const missing = await fetch(`${baseUrl}/assets/nope.js`);
    expect(missing.status).toBe(404);
  });

  it("blocks asset path traversal and acknowledges a ping for a live session", async () => {
    const traversal = await fetch(`${baseUrl}/assets/..%2f..%2fviewer.html`);
    expect(traversal.status).toBe(404);
    const out = await handleRenderViewer({ content: "ping target" });
    const sid = sessionIdFrom(out.url);
    const ping = await fetch(
      `${baseUrl}/api/ping?session=${sid}&token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(ping.status).toBe(200);
  });

  it("rejects a ping for an unknown session with 404", async () => {
    const ping = await fetch(
      `${baseUrl}/api/ping?session=rs_dead&token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(ping.status).toBe(404);
  });

  it("rejects a ping for a closed session with 404", async () => {
    const out = await handleRenderViewer({ content: "ping closed" });
    const sid = sessionIdFrom(out.url);
    const closed = await fetch(
      `${baseUrl}/api/close?session=${sid}&token=${token}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    expect(closed.status).toBe(200);
    const ping = await fetch(
      `${baseUrl}/api/ping?session=${sid}&token=${token}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    expect(ping.status).toBe(404);
  });
});
