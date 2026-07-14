import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { locatePluginRoot } from "../locatePluginRoot.js";

let root: string;

/** Mirrors an installed plugin: manifest at the root, bundle under `bridge/`. */
function installPlugin(marker: "canonical" | "adapter"): string {
  const pluginDir = join(root, "plugins", "deilen");
  mkdirSync(join(pluginDir, "bridge"), { recursive: true });
  if (marker === "canonical") {
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(join(pluginDir, ".claude-plugin", "plugin.json"), "{}");
  } else writeFileSync(join(pluginDir, "plugin.json"), "{}");
  return pluginDir;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ogham-locate-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("locatePluginRoot", () => {
  it("finds the plugin from the bundle that ships inside it — the layout every host installs", () => {
    const pluginDir = installPlugin("canonical");
    expect(locatePluginRoot(join(pluginDir, "bridge"))).toBe(pluginDir);
  });

  it("accepts the root manifest too, since the compiler emits a copy there for Codex and agy", () => {
    const pluginDir = installPlugin("adapter");
    expect(locatePluginRoot(join(pluginDir, "bridge"))).toBe(pluginDir);
  });

  it("stops at the nearest plugin, not an outer one — a plugin never contains another", () => {
    const pluginDir = installPlugin("canonical");
    const nested = join(pluginDir, "bridge", "assets");
    mkdirSync(nested, { recursive: true });
    expect(locatePluginRoot(nested)).toBe(pluginDir);
  });

  it("returns null above the plugin rather than handing back a directory that only looks like one", () => {
    installPlugin("canonical");
    expect(locatePluginRoot(join(root, "plugins"))).toBeNull();
  });

  it("gives up past the depth bound instead of walking to the filesystem root", () => {
    const pluginDir = installPlugin("canonical");
    const deep = join(pluginDir, "a", "b", "c", "d", "e", "f", "g", "h");
    mkdirSync(deep, { recursive: true });
    expect(locatePluginRoot(deep)).toBeNull();
  });

  it("returns null when the caller has no location to walk from (an emptied import.meta)", () => {
    expect(locatePluginRoot(null)).toBeNull();
  });
});
