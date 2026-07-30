import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ConfigLayerPaths } from "@ogham/cross-platform";
import { beforeEach, describe, expect, it } from "vitest";

import { CONFIG_VERSION } from "../../../types/config.js";
import { loadConfig } from "../operations/loadConfig.js";
import { loadConfigState } from "../operations/loadConfigState.js";
import { saveConfig } from "../operations/saveConfig.js";

let layers: ConfigLayerPaths;

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), "deilen-layers-"));
  layers = {
    user: join(root, "user", "config.json"),
    project: join(root, "workspace", ".deilen", "config.json"),
  };
});

function seed(path: string, document: Record<string, unknown>): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(document), "utf8");
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("config layering", () => {
  it("falls back to defaults when neither layer exists", async () => {
    await expect(loadConfig(layers)).resolves.toMatchObject({
      theme: "auto",
      content_width_px: 820,
    });
  });

  it("uses the user layer alone", async () => {
    seed(layers.user, { theme: "dark", config_version: CONFIG_VERSION });

    await expect(loadConfig(layers)).resolves.toMatchObject({ theme: "dark" });
  });

  it("uses the project layer alone, filling the rest from defaults", async () => {
    seed(layers.project as string, { theme: "light" });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      theme: "light",
      content_width_px: 820,
    });
  });

  it("lets the project layer override only the keys it names", async () => {
    seed(layers.user, {
      theme: "dark",
      content_width_px: 900,
      config_version: CONFIG_VERSION,
    });
    seed(layers.project as string, { theme: "light" });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      theme: "light",
      content_width_px: 900,
    });
  });

  it("merges nested renderers key by key rather than wholesale", async () => {
    seed(layers.user, {
      renderers: { mermaid: false, highlight: false, math: false },
      config_version: CONFIG_VERSION,
    });
    seed(layers.project as string, { renderers: { math: true } });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      renderers: { mermaid: false, highlight: false, math: true },
    });
  });

  it("degrades rather than throwing when a layer is damaged", async () => {
    mkdirSync(join(layers.user, ".."), { recursive: true });
    writeFileSync(layers.user, "{ not json", "utf8");
    seed(layers.project as string, { theme: "light" });

    // The damaged layer reads as absent, so the project layer still applies.
    await expect(loadConfig(layers)).resolves.toMatchObject({ theme: "light" });
  });

  it("degrades to defaults when the merged result violates the schema", async () => {
    seed(layers.user, { max_image_mb: 80, max_payload_mb: 50 });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      max_image_mb: 10,
      max_payload_mb: 50,
    });
  });

  it("migrates a pre-versioning user layer and persists the bump", async () => {
    seed(layers.user, { collect_timeout_seconds: 45 });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      collect_timeout_seconds: 600,
      config_version: CONFIG_VERSION,
    });
    expect(readJson(layers.user)).toMatchObject({
      collect_timeout_seconds: 600,
      config_version: CONFIG_VERSION,
    });
  });

  it("does not migrate the project layer or stamp a version into it", async () => {
    seed(layers.user, { theme: "dark", config_version: CONFIG_VERSION });
    seed(layers.project as string, { collect_timeout_seconds: 45 });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      collect_timeout_seconds: 45,
    });
    expect(readJson(layers.project as string)).toEqual({
      collect_timeout_seconds: 45,
    });
  });
});

describe("saveConfig", () => {
  it("writes the user layer without touching the project layer", async () => {
    seed(layers.project as string, { theme: "light" });

    await saveConfig("user", { theme: "dark" }, layers);

    expect(readJson(layers.user)).toEqual({
      theme: "dark",
      config_version: CONFIG_VERSION,
    });
    expect(readJson(layers.project as string)).toEqual({ theme: "light" });
  });

  it("writes the project layer without touching the user layer", async () => {
    seed(layers.user, { theme: "dark", config_version: CONFIG_VERSION });

    await saveConfig("project", { theme: "light" }, layers);

    expect(readJson(layers.user)).toEqual({
      theme: "dark",
      config_version: CONFIG_VERSION,
    });
    expect(readJson(layers.project as string)).toEqual({ theme: "light" });
  });

  it("refuses to write a project layer that has no path", async () => {
    await expect(
      saveConfig(
        "project",
        { theme: "light" },
        { user: layers.user, project: null },
      ),
    ).rejects.toThrow(/no project root/);
  });

  it("reports which paths the project layer overrides", () => {
    seed(layers.user, { theme: "dark", config_version: CONFIG_VERSION });
    seed(layers.project as string, { renderers: { math: false } });

    expect(loadConfigState(layers).overridden).toEqual(["renderers.math"]);
  });
});
