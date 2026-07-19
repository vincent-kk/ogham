import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { handleOpenSettings } from "../../tools/openSettings/openSettings.js";
import { getHttpServer } from "../httpServer.js";

const SETTINGS_HTML = `<!doctype html><html data-theme="auto"><head><title>s</title></head><body><script>window.__DEILEN_STATE__="__DEILEN_STATE__";</script></body></html>`;

let baseUrl = "";
let token = "";

beforeAll(() => {
  const pluginRoot = mkdtempSync(join(tmpdir(), "deilen-settings-"));
  mkdirSync(join(pluginRoot, "public", "assets"), { recursive: true });
  writeFileSync(join(pluginRoot, "public", "settings.html"), SETTINGS_HTML);
  writeFileSync(join(pluginRoot, "public", "viewer.html"), "x");
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
});

afterAll(async () => {
  await getHttpServer()?.close();
});

describe("settings flow", () => {
  it("serves the settings page with injected config", async () => {
    const out = await handleOpenSettings();
    const url = new URL(out.url);
    token = url.searchParams.get("token") ?? "";
    baseUrl = url.origin;
    expect(url.pathname).toBe("/settings");

    const res = await fetch(out.url);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain('"__DEILEN_STATE__"');
    expect(html).toContain('"config"');
  });

  it("reads and persists config round-trip", async () => {
    const initial = await fetch(`${baseUrl}/api/config?token=${token}`);
    const before = (await initial.json()) as { config: { theme: string } };
    expect(before.config.theme).toBeDefined();

    const save = await fetch(`${baseUrl}/api/config?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...before.config,
        theme: "dark",
        content_width_px: 900,
      }),
    });
    expect(save.status).toBe(200);

    const after = await fetch(`${baseUrl}/api/config?token=${token}`);
    const body = (await after.json()) as {
      config: { theme: string; content_width_px: number };
    };
    expect(body.config.theme).toBe("dark");
    expect(body.config.content_width_px).toBe(900);
  });

  it("keeps a deliberately saved collect_timeout_seconds of 45", async () => {
    const initial = await fetch(`${baseUrl}/api/config?token=${token}`);
    const before = (await initial.json()) as {
      config: Record<string, unknown>;
    };

    const save = await fetch(`${baseUrl}/api/config?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...before.config, collect_timeout_seconds: 45 }),
    });
    expect(save.status).toBe(200);

    const after = await fetch(`${baseUrl}/api/config?token=${token}`);
    const body = (await after.json()) as {
      config: { collect_timeout_seconds: number };
    };
    expect(body.config.collect_timeout_seconds).toBe(45);
  });

  it("rejects an invalid config with 400", async () => {
    const res = await fetch(`${baseUrl}/api/config?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_image_mb: 80, max_payload_mb: 50 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid token", async () => {
    const res = await fetch(`${baseUrl}/api/config?token=nope`);
    expect(res.status).toBe(401);
  });
});
