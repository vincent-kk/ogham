import { describe, expect, it } from "vitest";

import type { McpServerSource, PluginFacts } from "../../types/index.js";
import { buildAgyMcpConfig } from "../builders/buildAgyMcpConfig.js";

function facts(
  mcpServers: Record<string, McpServerSource> | null,
): PluginFacts {
  return {
    directory: "/repo/plugins/deilen",
    name: "deilen",
    manifest: { name: "deilen" },
    hasSkills: false,
    hasHooks: false,
    hooksFile: null,
    mcpServers,
  };
}

describe("buildAgyMcpConfig", () => {
  // --- basic ---

  it("returns null when the plugin declares no MCP servers", () => {
    expect(buildAgyMcpConfig(facts(null))).toBeNull();
  });

  it("wraps servers in an mcpServers object", () => {
    const built = buildAgyMcpConfig(
      facts({ tools: { command: "node", args: ["b.cjs"] } }),
    );
    expect(built).toEqual({
      mcpServers: {
        tools: { command: "node", args: ["b.cjs"], env: { OGHAM_HOST: "agy" } },
      },
    });
  });

  it("stamps the agy host marker", () => {
    const built = buildAgyMcpConfig(
      facts({ tools: { command: "node", args: [] } }),
    ) as { mcpServers: Record<string, McpServerSource> };
    expect(built.mcpServers.tools.env?.OGHAM_HOST).toBe("agy");
  });

  // --- complex ---

  it("keeps original server names (unlike the codex adapter)", () => {
    const built = buildAgyMcpConfig(
      facts({
        tools: { command: "node", args: [] },
        t: { command: "node", args: [] },
      }),
    ) as { mcpServers: Record<string, McpServerSource> };
    expect(Object.keys(built.mcpServers)).toEqual(["tools", "t"]);
  });

  it("relativizes plugin-root args", () => {
    const built = buildAgyMcpConfig(
      facts({
        t: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/bridge/x.cjs"] },
      }),
    ) as { mcpServers: Record<string, McpServerSource> };
    expect(built.mcpServers.t.args).toEqual(["bridge/x.cjs"]);
  });

  it("omits cwd — the agy MCP schema has no such field (codex-only)", () => {
    const built = buildAgyMcpConfig(
      facts({ t: { command: "node", args: ["b.cjs"] } }),
    ) as { mcpServers: Record<string, McpServerSource & { cwd?: string }> };
    expect(built.mcpServers.t.cwd).toBeUndefined();
  });
});
