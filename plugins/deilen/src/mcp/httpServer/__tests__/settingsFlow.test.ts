import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ConfigScopeState } from "@ogham/cross-platform";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { handleOpenSettings } from "../../tools/openSettings/openSettings.js";
import { getHttpServer } from "../httpServer.js";

const SETTINGS_HTML = `<!doctype html><html data-theme="auto"><head><title>s</title></head><body><script>window.__DEILEN_STATE__="__DEILEN_STATE__";</script></body></html>`;

let baseUrl = "";
let token = "";
let workspace = "";

beforeAll(() => {
  const pluginRoot = mkdtempSync(join(tmpdir(), "deilen-settings-"));
  mkdirSync(join(pluginRoot, "public", "assets"), { recursive: true });
  writeFileSync(join(pluginRoot, "public", "settings.html"), SETTINGS_HTML);
  writeFileSync(join(pluginRoot, "public", "viewer.html"), "x");
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  // A temp workspace, never the repository this test runs from: the project
  // layer is written for real and would otherwise land in plugins/deilen.
  workspace = mkdtempSync(join(tmpdir(), "deilen-workspace-"));
});

afterAll(async () => {
  await getHttpServer()?.close();
});

async function getState(): Promise<ConfigScopeState> {
  const response = await fetch(`${baseUrl}/api/config?token=${token}`);
  const body = (await response.json()) as { state: ConfigScopeState };
  return body.state;
}

async function post(payload: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/config?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("settings flow", () => {
  it("serves the settings page with the scope state injected", async () => {
    const out = await handleOpenSettings({ project_root: workspace });
    const url = new URL(out.url);
    token = url.searchParams.get("token") ?? "";
    baseUrl = url.origin;
    expect(url.pathname).toBe("/settings");

    const res = await fetch(out.url);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain('"__DEILEN_STATE__"');
    expect(html).toContain('"state"');
    expect(html).toContain('"overridden"');
  });

  it("round-trips the user layer", async () => {
    const before = await getState();
    expect(before.paths.project).toContain(".deilen");

    const save = await post({
      scope: "user",
      config: { ...before.effective, theme: "dark", content_width_px: 900 },
    });
    expect(save.status).toBe(200);

    const after = await getState();
    expect(after.effective.theme).toBe("dark");
    expect(after.effective.content_width_px).toBe(900);
    expect(after.overridden).toEqual([]);
  });

  it("lets a partial project layer override just one key", async () => {
    const save = await post({ scope: "project", config: { theme: "light" } });
    expect(save.status).toBe(200);
    const returned = (await save.json()) as { state: ConfigScopeState };
    expect(returned.state.overridden).toEqual(["theme"]);

    const after = await getState();
    expect(after.effective.theme).toBe("light");
    // The user layer keeps its own value, and the untouched key still wins.
    expect(after.layers.user?.theme).toBe("dark");
    expect(after.effective.content_width_px).toBe(900);
  });

  it("writes the project layer to the workspace, not the user directory", () => {
    const onDisk = JSON.parse(
      readFileSync(join(workspace, ".deilen", "config.json"), "utf8"),
    ) as Record<string, unknown>;

    // Only the overridden key, and no version stamp: the project layer is a
    // partial override, not a baseline.
    expect(onDisk).toEqual({ theme: "light" });
  });

  it("clears an override when the key is dropped from the project layer", async () => {
    const save = await post({ scope: "project", config: {} });
    expect(save.status).toBe(200);

    const after = await getState();
    expect(after.overridden).toEqual([]);
    expect(after.effective.theme).toBe("dark");
  });

  it("keeps a deliberately saved collect_timeout_seconds of 45", async () => {
    const before = await getState();
    const save = await post({
      scope: "user",
      config: { ...before.effective, collect_timeout_seconds: 45 },
    });
    expect(save.status).toBe(200);

    expect((await getState()).effective.collect_timeout_seconds).toBe(45);
  });

  it("rejects a body that does not name a scope", async () => {
    const res = await post({ theme: "dark" });
    expect(res.status).toBe(400);
  });

  it("rejects a project layer whose merged preview is invalid", async () => {
    // max_payload_mb must be >= max_image_mb; the project layer alone says
    // nothing about that, so only the merged preview can catch it.
    const res = await post({ scope: "project", config: { max_image_mb: 80 } });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid user config with 400", async () => {
    const res = await post({
      scope: "user",
      config: { max_image_mb: 80, max_payload_mb: 50 },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid token", async () => {
    const res = await fetch(`${baseUrl}/api/config?token=nope`);
    expect(res.status).toBe(401);
  });
});
