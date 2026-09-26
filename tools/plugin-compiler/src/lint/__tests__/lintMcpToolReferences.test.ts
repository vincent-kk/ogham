import { describe, expect, it } from "vitest";

import type { PluginFacts } from "../../types/index.js";
import { lintMcpToolReferences } from "../checks/lintMcpToolReferences.js";

/** Build anonymous inputs for diagnostic classification without filesystem I/O. */
function facts(content: string, matcher = "Bash"): PluginFacts {
  return {
    directory: "/repo/plugin",
    name: "example",
    manifest: { name: "example" },
    hasSkills: true,
    hasHooks: true,
    agentFiles: {},
    skillFiles: { "run/SKILL.md": content },
    mcpServers: { tools: { command: "node", args: [] } },
    hooksFile: { hooks: { PostToolUse: [{ matcher }] } },
  };
}

describe("MCP reference diagnostics", () => {
  it("reports malformed marker errors under the stable reference code", () => {
    expect(
      lintMcpToolReferences(facts("<!-- ogham-mcp-tools:wrong -->")),
    ).toEqual([
      {
        level: "error",
        code: "codex-mcp-tool-reference",
        message: expect.stringContaining("run/SKILL.md"),
      },
    ]);
  });

  it("reports owned compound hook regexes under the matcher code", () => {
    expect(
      lintMcpToolReferences(
        facts(
          "<!-- ogham-mcp-tools:example -->",
          "^mcp__plugin_example_tools__.*$",
        ),
      ),
    ).toEqual([
      {
        level: "error",
        code: "codex-mcp-hook-matcher",
        message: expect.stringContaining("PostToolUse"),
      },
    ]);
  });

  it("leaves an unmarked plugin's regex behavior unchanged", () => {
    expect(
      lintMcpToolReferences(
        facts("ordinary skill", "^mcp__plugin_example_tools__.*$"),
      ),
    ).toEqual([]);
  });

  it("reports missing owned servers without leaking server configuration", () => {
    const input = facts(
      "<!-- ogham-mcp-tools:example -->\nmcp__plugin_example_missing__read",
    );
    input.mcpServers!.tools.env = { PRIVATE_VALUE: "not-for-diagnostics" };
    const diagnostics = lintMcpToolReferences(input);
    expect(diagnostics[0]?.code).toBe("codex-mcp-tool-reference");
    expect(JSON.stringify(diagnostics)).not.toContain("not-for-diagnostics");
  });

  it("validates a selected mapping without changing the inputs", () => {
    const input = facts(
      "<!-- ogham-mcp-tools:example -->\nmcp__plugin_example_tools__read",
    );
    const before = structuredClone(input);
    expect(lintMcpToolReferences(input)).toEqual([]);
    expect(input).toEqual(before);
  });
});
