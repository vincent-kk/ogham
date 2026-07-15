import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { planPluginAdapters } from "../steps/planPluginAdapters.js";

let pluginDirectory: string;

beforeEach(() => {
  pluginDirectory = mkdtempSync(join(tmpdir(), "plugin-compiler-plan-"));
});

afterEach(() => {
  rmSync(pluginDirectory, { recursive: true, force: true });
});

function writeJson(relativePath: string, value: unknown): void {
  const path = join(pluginDirectory, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(value), "utf8");
}

/** Forward-slash a path so assertions hold on Windows (join yields backslashes). */
function norm(p: string): string {
  return p.replaceAll("\\", "/");
}

function emittedPaths(): string[] {
  return planPluginAdapters(pluginDirectory).files.map((file) =>
    norm(file.absolutePath.slice(pluginDirectory.length + 1)),
  );
}

describe("planPluginAdapters", () => {
  // --- basic ---

  it("emits the manifest to both the plugin root and .codex-plugin", () => {
    writeJson(".claude-plugin/plugin.json", {
      name: "deilen",
      version: "1.0.0",
    });
    expect(emittedPaths()).toEqual([
      ".codex-plugin/plugin.json",
      "plugin.json",
    ]);
  });

  it("adds mcp_config.json only when the plugin declares MCP servers", () => {
    writeJson(".claude-plugin/plugin.json", { name: "deilen" });
    writeJson(".mcp.json", {
      mcpServers: { tools: { command: "node", args: ["bridge/x.cjs"] } },
    });
    expect(emittedPaths()).toContain("mcp_config.json");
  });

  // --- complex ---

  it("keeps the two manifest copies byte-identical — the hosts must not diverge", () => {
    writeJson(".claude-plugin/plugin.json", {
      name: "deilen",
      version: "2.0.0",
    });
    writeJson(".mcp.json", {
      mcpServers: { tools: { command: "node", args: ["bridge/x.cjs"] } },
    });
    const { files } = planPluginAdapters(pluginDirectory);
    const root = files.find((f) => norm(f.absolutePath).endsWith("/plugin.json"));
    const codex = files.find((f) =>
      norm(f.absolutePath).endsWith(".codex-plugin/plugin.json"),
    );
    expect(root?.content).toBe(codex?.content);
    expect(root?.content).toContain('"mcpServers"');
  });

  it("never writes a Claude-consumed file", () => {
    writeJson(".claude-plugin/plugin.json", { name: "deilen" });
    writeJson(".mcp.json", {
      mcpServers: { tools: { command: "node", args: ["bridge/x.cjs"] } },
    });
    for (const path of emittedPaths()) {
      expect(path).not.toMatch(/^\.claude-plugin\//);
      expect(path).not.toBe(".mcp.json");
    }
  });

  it("reports an unusable MCP variable as a diagnostic instead of throwing", () => {
    writeJson(".claude-plugin/plugin.json", { name: "deilen" });
    writeJson(".mcp.json", {
      mcpServers: {
        tools: { command: "${CLAUDE_PLUGIN_ROOT}/node", args: [] },
      },
    });
    const { files, diagnostics } = planPluginAdapters(pluginDirectory);
    expect(files).toEqual([]);
    expect(diagnostics.at(-1)?.code).toBe("mcp-variable-args");
  });

  it("emits agy hooks.json for a plugin with a PreToolUse hook", () => {
    writeJson(".claude-plugin/plugin.json", { name: "filid" });
    writeJson("hooks/hooks.json", {
      hooks: {
        PreToolUse: [
          {
            matcher: "Read|Write|Edit",
            hooks: [
              {
                command:
                  'node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" "${CLAUDE_PLUGIN_ROOT}/bridge/pre-tool-use.mjs"',
              },
            ],
          },
        ],
      },
    });
    const { files } = planPluginAdapters(pluginDirectory);
    const agy = files.find((f) => norm(f.absolutePath).endsWith("/hooks.json"));
    expect(agy?.content).toContain(
      "node bridge/run-agy.mjs PreToolUse bridge/pre-tool-use.mjs",
    );
  });

  it("omits agy hooks.json for a plugin without a PreToolUse hook", () => {
    writeJson(".claude-plugin/plugin.json", { name: "maencof-lens" });
    writeJson("hooks/hooks.json", {
      hooks: {
        SessionStart: [
          {
            matcher: "*",
            hooks: [
              { command: 'node "${CLAUDE_PLUGIN_ROOT}/bridge/setup.mjs"' },
            ],
          },
        ],
      },
    });
    expect(emittedPaths()).not.toContain("hooks.json");
  });
});
