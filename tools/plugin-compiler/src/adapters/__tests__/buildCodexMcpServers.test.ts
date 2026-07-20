import { describe, expect, it } from "vitest";

import type { McpServerSource, PluginFacts } from "../../types/index.js";
import { buildCodexMcpServers } from "../builders/buildCodexMcpServers.js";

function facts(
  mcpServers: Record<string, McpServerSource> | null,
  name = "cennad",
): PluginFacts {
  return {
    directory: `/repo/plugins/${name}`,
    name,
    manifest: { name },
    hasSkills: false,
    agentFiles: {},
    skillFiles: {},
    hasHooks: false,
    hooksFile: null,
    mcpServers,
  };
}

const server: McpServerSource = { command: "node", args: ["bridge/mcp.cjs"] };

describe("buildCodexMcpServers", () => {
  // --- basic ---

  it("returns null when the plugin declares no MCP servers", () => {
    expect(buildCodexMcpServers(facts(null))).toBeNull();
  });

  it("renames a lone server to the plugin name", () => {
    const built = buildCodexMcpServers(facts({ tools: server }));
    expect(Object.keys(built ?? {})).toEqual(["cennad"]);
  });

  it("stamps the codex host marker", () => {
    const built = buildCodexMcpServers(facts({ tools: server }));
    expect(built?.cennad.env?.OGHAM_HOST).toBe("codex");
  });

  // --- complex ---

  it("suffixes sibling servers with their original name", () => {
    const built = buildCodexMcpServers(
      facts({ tools: server, lens: server }, "maencof"),
    );
    expect(Object.keys(built ?? {})).toEqual(["maencof-tools", "maencof-lens"]);
  });

  it("carries the command and relativized args across the rename", () => {
    const built = buildCodexMcpServers(
      facts({ t: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/b.cjs"] } }),
    );
    expect(built?.cennad).toEqual({
      command: "node",
      args: ["b.cjs"],
      cwd: ".",
      env: { OGHAM_HOST: "codex" },
    });
  });

  it("pins cwd to the plugin root so relative args resolve on codex", () => {
    const built = buildCodexMcpServers(
      facts({ tools: server, lens: server }, "maencof"),
    );
    expect(Object.values(built ?? {}).map((s) => s.cwd)).toEqual([".", "."]);
  });

  it("returns an empty map when mcpServers is an empty object", () => {
    expect(buildCodexMcpServers(facts({}))).toEqual({});
  });
});
