import { describe, expect, it } from "vitest";

import type { PluginFacts } from "../../types/index.js";
import { buildCodexPluginManifest } from "../builders/buildCodexPluginManifest.js";

function facts(overrides: Partial<PluginFacts> = {}): PluginFacts {
  return {
    directory: "/repo/plugins/filid",
    name: "filid",
    manifest: { name: "filid", version: "1.2.3", description: "d" },
    hasSkills: false,
    hasHooks: false,
    hooksFile: null,
    mcpServers: null,
    ...overrides,
  };
}

describe("buildCodexPluginManifest", () => {
  // --- basic ---

  it("copies the allow-listed metadata fields", () => {
    expect(buildCodexPluginManifest(facts())).toEqual({
      name: "filid",
      version: "1.2.3",
      description: "d",
    });
  });

  it("declares skills when the plugin ships a skills directory", () => {
    expect(buildCodexPluginManifest(facts({ hasSkills: true })).skills).toBe(
      "./skills/",
    );
  });

  it("points hooks at the file Claude already consumes", () => {
    expect(buildCodexPluginManifest(facts({ hasHooks: true })).hooks).toBe(
      "./hooks/hooks.json",
    );
  });

  // --- complex ---

  it("drops manifest fields outside the allow list", () => {
    const built = buildCodexPluginManifest(
      facts({ manifest: { name: "filid", mcpServers: { evil: {} } } }),
    );
    expect(built).toEqual({ name: "filid" });
  });

  it("omits skills and hooks keys when neither exists", () => {
    const built = buildCodexPluginManifest(facts());
    expect("skills" in built).toBe(false);
    expect("hooks" in built).toBe(false);
  });

  it("inlines mcpServers under the plugin name", () => {
    const built = buildCodexPluginManifest(
      facts({ mcpServers: { t: { command: "node", args: ["b.cjs"] } } }),
    );
    expect(built.mcpServers).toEqual({
      filid: {
        command: "node",
        args: ["b.cjs"],
        cwd: ".",
        env: { OGHAM_HOST: "codex" },
      },
    });
  });

  it("omits mcpServers when the plugin has none", () => {
    expect("mcpServers" in buildCodexPluginManifest(facts())).toBe(false);
  });

  it("emits keys in a stable order regardless of manifest key order", () => {
    const built = buildCodexPluginManifest(
      facts({
        manifest: { description: "d", version: "1.2.3", name: "filid" },
      }),
    );
    expect(Object.keys(built)).toEqual(["name", "version", "description"]);
  });
});
