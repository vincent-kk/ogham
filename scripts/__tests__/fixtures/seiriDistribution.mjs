import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Minimal real-compiler input; intentionally includes stale adapters and unrelated private files. */
export function seiriDistributionFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "seiri-distribution-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "source");
  const write = (file, text) => {
    const target = join(source, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      typeof text === "string" ? text : JSON.stringify(text),
    );
  };
  write("package.json", {
    name: "seiri",
    files: [
      "bridge",
      "libs",
      "hooks",
      "skills",
      ".claude-plugin",
      ".mcp.json",
      "plugin-compiler.json",
      "README.md",
      "plugin.json",
      ".codex-plugin/",
      "mcp_config.json",
      "hooks.json",
    ],
  });
  write("plugin-compiler.json", { codexHookRuntime: "bridge/codex" });
  write(".claude-plugin/plugin.json", {
    name: "seiri",
    version: "0.0.0",
    description: "Distribution fixture",
    skills: "./skills/",
    mcpServers: "./.mcp.json",
  });
  write(".mcp.json", {
    mcpServers: {
      tools: {
        command: "node",
        args: [
          "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs",
          "${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs",
        ],
      },
    },
  });
  write("hooks/hooks.json", {
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            {
              type: "command",
              command:
                'node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" "${CLAUDE_PLUGIN_ROOT}/bridge/pre-tool-use.mjs"',
            },
          ],
        },
      ],
    },
  });
  write(
    "skills/execute/SKILL.md",
    "---\nname: execute\ndescription: Fixture\n---\n[Reference](references/sample.md)\n",
  );
  write("skills/execute/references/sample.md", "Canonical reference\n");
  for (const file of [
    "libs/run.cjs",
    "bridge/pre-tool-use.mjs",
    "bridge/codex/pre-tool-use.mjs",
    "bridge/run-agy.mjs",
    "bridge/mcp-server.cjs",
  ])
    write(file, "// current built runtime\n");
  write("README.md", "Fixture distribution\n");
  write("plugin.json", "stale root adapter");
  write(".codex-plugin/stale.txt", "must never be copied");
  write("mcp_config.json", "stale MCP adapter");
  write("hooks.json", "stale hook adapter");
  write("private-not-packaged.txt", "not package input");
  return { root, source, output: join(root, "output"), write };
}
