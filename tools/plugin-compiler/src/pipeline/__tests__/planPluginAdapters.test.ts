import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CLAUDE_MANIFEST_PATH } from "../../constants/claudeArtifacts.js";
import { planPluginAdapters } from "../steps/planPluginAdapters.js";

let pluginDirectory: string;

beforeEach(() => {
  pluginDirectory = mkdtempSync(join(tmpdir(), "plugin-compiler-plan-"));
});

afterEach(() => {
  rmSync(pluginDirectory, { recursive: true, force: true });
});

function writeJson(relativePath: string, value: unknown): void {
  writeFile(relativePath, JSON.stringify(value));
}

function writeFile(relativePath: string, content: string): void {
  const path = join(pluginDirectory, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
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
    const root = files.find((f) =>
      norm(f.absolutePath).endsWith("/plugin.json"),
    );
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

  it("reports a missing/non-plugin directory as a diagnostic instead of crashing", () => {
    const missingDirectory = join(pluginDirectory, "does-not-exist");
    const { files, diagnostics } = planPluginAdapters(missingDirectory);
    expect(files).toEqual([]);
    expect(diagnostics).toEqual([
      {
        level: "error",
        code: "plugin-directory-not-found",
        // Mirror production's native-separator path (join, no norm) so the
        // substring holds on Windows too — the message carries a raw join()
        // result (backslashes on Windows), not a forward-slashed path.
        message: expect.stringContaining(
          join(missingDirectory, CLAUDE_MANIFEST_PATH),
        ),
      },
    ]);
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
    // Both the agy root file and the Codex copy end in `/hooks.json`; match the
    // root one exactly so the Codex copy cannot be mistaken for it.
    const agy = files.find(
      (f) =>
        norm(f.absolutePath).slice(pluginDirectory.length + 1) === "hooks.json",
    );
    expect(agy?.content).toContain(
      "node bridge/run-agy.mjs PreToolUse bridge/pre-tool-use.mjs",
    );
  });

  it("emits a Bash-extended .codex-plugin/hooks.json for a read matcher", () => {
    writeJson(".claude-plugin/plugin.json", { name: "filid" });
    writeJson("hooks/hooks.json", {
      hooks: {
        PreToolUse: [
          { matcher: "Read|Write|Edit", hooks: [{ command: "node b.mjs" }] },
        ],
      },
    });
    const { files } = planPluginAdapters(pluginDirectory);
    const codex = files.find((f) =>
      norm(f.absolutePath).endsWith(".codex-plugin/hooks.json"),
    );
    expect(codex?.content).toContain("Read|Write|Edit|Bash");
  });

  it("filters unsupported events and repoints the Codex manifest", () => {
    writeJson(".claude-plugin/plugin.json", { name: "seiri" });
    writeJson("hooks/hooks.json", {
      hooks: {
        PostToolUse: [{ matcher: "Bash", hooks: [{ command: "node p.mjs" }] }],
        PostToolUseFailure: [
          { matcher: "Bash", hooks: [{ command: "node p.mjs" }] },
        ],
      },
    });
    const { files } = planPluginAdapters(pluginDirectory);
    const codexHooks = files.find((file) =>
      norm(file.absolutePath).endsWith(".codex-plugin/hooks.json"),
    );
    expect(codexHooks?.content).toContain('"PostToolUse"');
    expect(codexHooks?.content).not.toContain('"PostToolUseFailure"');

    const manifest = files.find((file) =>
      norm(file.absolutePath).endsWith(".codex-plugin/plugin.json"),
    );
    expect(manifest?.content).toContain(
      '"hooks": "./.codex-plugin/hooks.json"',
    );
  });

  it("omits .codex-plugin/hooks.json when the matcher already catches Bash (`*`)", () => {
    writeJson(".claude-plugin/plugin.json", { name: "maencof" });
    writeJson("hooks/hooks.json", {
      hooks: {
        PreToolUse: [{ matcher: "*", hooks: [{ command: "node b.mjs" }] }],
      },
    });
    expect(emittedPaths()).not.toContain(".codex-plugin/hooks.json");
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

  it("emits a Codex skill variant + repoints skills for an opted-in plugin", () => {
    writeJson(".claude-plugin/plugin.json", { name: "filid" });
    writeFile(
      "skills/resolve/SKILL.md",
      'spawn `subagent_type: "filid:code-surgeon"`',
    );
    writeFile("skills/resolve/contracts.md", "plain copy");
    writeFile("agents/code-surgeon.md", "PERSONA");
    const { files } = planPluginAdapters(pluginDirectory);
    const paths = files.map((f) =>
      norm(f.absolutePath.slice(pluginDirectory.length + 1)),
    );
    expect(paths).toContain(".codex-plugin/skills/resolve/SKILL.md");
    expect(paths).toContain(".codex-plugin/skills/resolve/contracts.md");
    expect(paths).toContain(
      ".codex-plugin/skills/.shared/personas/code-surgeon.md",
    );

    const manifest = files.find((f) =>
      norm(f.absolutePath).endsWith(".codex-plugin/plugin.json"),
    );
    expect(manifest?.content).toContain('"skills": "./.codex-plugin/skills/"');

    const skill = files.find((f) =>
      norm(f.absolutePath).endsWith(".codex-plugin/skills/resolve/SKILL.md"),
    );
    expect(skill?.content).toContain("codex-persona-spawn");
    // a non-spawn sibling is copied byte-for-byte
    const contracts = files.find((f) =>
      norm(f.absolutePath).endsWith(
        ".codex-plugin/skills/resolve/contracts.md",
      ),
    );
    expect(contracts?.content).toBe("plain copy");
  });

  it("emits a Codex lifecycle variant for an explicitly marked plugin", () => {
    writeJson(".claude-plugin/plugin.json", { name: "cennad" });
    writeFile(
      "skills/codex/SKILL.md",
      `<!-- ogham-async-agent:spawn cennad:courier -->
Claude spawn
<!-- ogham-async-agent:end -->
<!-- ogham-async-agent:join cennad:courier -->
Claude join
<!-- ogham-async-agent:end -->`,
    );
    writeFile("agents/courier.md", "COURIER");

    const { files } = planPluginAdapters(pluginDirectory);
    const manifest = files.find((file) =>
      norm(file.absolutePath).endsWith(".codex-plugin/plugin.json"),
    );
    const skill = files.find((file) =>
      norm(file.absolutePath).endsWith(".codex-plugin/skills/codex/SKILL.md"),
    );

    expect(manifest?.content).toContain('"skills": "./.codex-plugin/skills/"');
    expect(skill?.content).toContain("`spawn_agent`");
    expect(skill?.content).toContain("`wait_agent`");
    expect(skill?.content).not.toContain("Claude spawn");
  });

  it("reports an invalid lifecycle marker with its own diagnostic", () => {
    writeJson(".claude-plugin/plugin.json", { name: "cennad" });
    writeFile(
      "skills/codex/SKILL.md",
      `<!-- ogham-async-agent:spawn cennad:courier -->
Claude spawn without an end marker`,
    );
    writeFile("agents/courier.md", "COURIER");

    const { files, diagnostics } = planPluginAdapters(pluginDirectory);
    expect(files).toEqual([]);
    expect(diagnostics.at(-1)?.code).toBe("codex-skill-lifecycle");
  });
});
