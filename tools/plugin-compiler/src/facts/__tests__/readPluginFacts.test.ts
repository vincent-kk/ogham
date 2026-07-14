import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readPluginFacts } from "../read/readPluginFacts.js";

let pluginDirectory: string;

beforeEach(() => {
  pluginDirectory = mkdtempSync(join(tmpdir(), "plugin-compiler-facts-"));
});

afterEach(() => {
  rmSync(pluginDirectory, { recursive: true, force: true });
});

function writeJson(relativePath: string, value: unknown): void {
  const path = join(pluginDirectory, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(value), "utf8");
}

function writeManifest(
  manifest: unknown = { name: "cennad", version: "1.0.0" },
) {
  writeJson(".claude-plugin/plugin.json", manifest);
}

describe("readPluginFacts", () => {
  // --- basic ---

  it("reads the plugin name and manifest", () => {
    writeManifest();
    const facts = readPluginFacts(pluginDirectory);
    expect(facts.name).toBe("cennad");
    expect(facts.manifest).toEqual({ name: "cennad", version: "1.0.0" });
  });

  it("reports absent skills, hooks and MCP servers", () => {
    writeManifest();
    const facts = readPluginFacts(pluginDirectory);
    expect(facts.hasSkills).toBe(false);
    expect(facts.hasHooks).toBe(false);
    expect(facts.mcpServers).toBeNull();
  });

  it("throws when the manifest has no name", () => {
    writeManifest({ version: "1.0.0" });
    expect(() => readPluginFacts(pluginDirectory)).toThrow(
      /manifest has no name/,
    );
  });

  // --- complex ---

  it("detects a skills directory", () => {
    writeManifest();
    mkdirSync(join(pluginDirectory, "skills"), { recursive: true });
    expect(readPluginFacts(pluginDirectory).hasSkills).toBe(true);
  });

  it("loads the hooks file when present", () => {
    writeManifest();
    writeJson("hooks/hooks.json", { hooks: { SessionStart: [] } });
    const facts = readPluginFacts(pluginDirectory);
    expect(facts.hasHooks).toBe(true);
    expect(facts.hooksFile).toEqual({ hooks: { SessionStart: [] } });
  });

  it("extracts mcpServers out of the Claude MCP file", () => {
    writeManifest();
    writeJson(".mcp.json", {
      mcpServers: { tools: { command: "node", args: ["b.cjs"] } },
    });
    expect(readPluginFacts(pluginDirectory).mcpServers).toEqual({
      tools: { command: "node", args: ["b.cjs"] },
    });
  });

  it("yields null when the MCP file declares no servers", () => {
    writeManifest();
    writeJson(".mcp.json", {});
    expect(readPluginFacts(pluginDirectory).mcpServers).toBeNull();
  });

  it("throws when the manifest name is an empty string", () => {
    writeManifest({ name: "" });
    expect(() => readPluginFacts(pluginDirectory)).toThrow(
      /manifest has no name/,
    );
  });
});
