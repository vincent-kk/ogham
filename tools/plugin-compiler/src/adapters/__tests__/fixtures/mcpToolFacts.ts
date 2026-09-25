import type { PluginFacts } from "../../../types/index.js";

/** Build anonymous canonical inputs; overrides select the contract under test. */
export function mcpToolFacts(
  overrides: Partial<PluginFacts> = {},
): PluginFacts {
  return {
    directory: "/repo/plugins/seiri",
    name: "seiri",
    manifest: { name: "seiri" },
    hasSkills: true,
    hasHooks: true,
    hooksFile: {
      hooks: {
        PostToolUse: [{ matcher: "Bash|mcp__plugin_seiri_tools__workflow" }],
      },
    },
    mcpServers: { tools: { command: "node", args: ["bridge/server.cjs"] } },
    agentFiles: {},
    skillFiles: {
      "execute/SKILL.md":
        "<!-- ogham-mcp-tools:seiri -->\nCall `mcp__plugin_seiri_tools__workflow`.",
      "execute/references/lifecycle.md": "UNCHANGED reference",
      "explain/SKILL.md": "[lifecycle](../execute/references/lifecycle.md)",
    },
    ...overrides,
  };
}
