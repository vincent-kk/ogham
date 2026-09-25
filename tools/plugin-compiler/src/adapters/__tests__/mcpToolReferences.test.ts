import { describe, expect, it } from "vitest";

import { buildCodexHooks } from "../builders/buildCodexHooks.js";
import { buildCodexMcpServers } from "../builders/buildCodexMcpServers.js";
import { buildCodexPluginManifest } from "../builders/buildCodexPluginManifest.js";
import { buildCodexSkills } from "../builders/buildCodexSkills.js";
import { mcpToolFacts } from "./fixtures/mcpToolFacts.js";

describe("explicit MCP tool references", () => {
  it("rewrites the owned token and emits the complete skill tree", () => {
    const facts = mcpToolFacts();
    const files = buildCodexSkills(facts);
    expect(files).toHaveLength(3);
    expect(
      files?.find((file) => file.relativePath.endsWith("execute/SKILL.md"))
        ?.content,
    ).toBe("\nCall `mcp__seiri__workflow`.");
    expect(
      files?.find((file) => file.relativePath.endsWith("explain/SKILL.md"))
        ?.content,
    ).toBe(facts.skillFiles["explain/SKILL.md"]);
    expect(
      files?.find((file) => file.relativePath.endsWith("lifecycle.md"))
        ?.content,
    ).toBe("UNCHANGED reference");
  });

  it("routes both skill and hook variants through the manifest", () => {
    expect(buildCodexPluginManifest(mcpToolFacts())).toMatchObject({
      skills: "./.codex-plugin/skills/",
      hooks: "./.codex-plugin/hooks.json",
    });
  });

  it("rewrites exact hook alternatives without changing the source", () => {
    const facts = mcpToolFacts();
    const before = structuredClone(facts);
    expect(buildCodexHooks(facts)).toEqual({
      hooks: { PostToolUse: [{ matcher: "Bash|mcp__seiri__workflow" }] },
    });
    expect(facts).toEqual(before);
  });

  it("keeps the current output of a plugin without an MCP marker", () => {
    const facts = mcpToolFacts({
      skillFiles: { "x/SKILL.md": "mcp__plugin_seiri_tools__workflow" },
    });
    expect(buildCodexSkills(facts)).toBeNull();
    expect(buildCodexHooks(facts)).toBeNull();
    expect(buildCodexPluginManifest(facts).skills).toBe("./skills/");
  });

  it("rewrites a marked reference file but preserves unmarked tool prose", () => {
    const facts = mcpToolFacts({
      skillFiles: {
        "x/SKILL.md": "mcp__plugin_seiri_tools__settings",
        "x/references/tools.md":
          "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri_tools__gates",
      },
    });
    expect(buildCodexSkills(facts)?.map((file) => file.content)).toEqual([
      "mcp__plugin_seiri_tools__settings",
      "\nmcp__seiri__gates",
    ]);
  });

  it("preserves similarly prefixed external tool names", () => {
    const source =
      "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri-extra_tools__workflow mcp__other__gates";
    const files = buildCodexSkills(
      mcpToolFacts({ skillFiles: { "x/SKILL.md": source } }),
    );
    expect(files?.[0].content).toBe(
      source.replace("<!-- ogham-mcp-tools:seiri -->", ""),
    );
  });

  it("normalizes callable names without renaming manifest keys", () => {
    const facts = mcpToolFacts({
      name: "r-statistics",
      manifest: { name: "r-statistics" },
      hooksFile: null,
      skillFiles: {
        "run/SKILL.md":
          "<!-- ogham-mcp-tools:r-statistics -->\nmcp__plugin_r-statistics_tools__run-r",
      },
    });
    expect(Object.keys(buildCodexMcpServers(facts)!)).toEqual(["r-statistics"]);
    expect(buildCodexSkills(facts)?.[0].content).toBe(
      "\nmcp__r_statistics__run_r",
    );
  });

  it("uses the multi-server name rule for skills and hooks", () => {
    const facts = mcpToolFacts({
      mcpServers: {
        tools: { command: "node", args: [] },
        "read-only": { command: "node", args: [] },
      },
      skillFiles: {
        "x/SKILL.md":
          "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri_read-only__get_value",
      },
    });
    expect(Object.keys(buildCodexMcpServers(facts)!)).toEqual([
      "seiri-tools",
      "seiri-read-only",
    ]);
    expect(buildCodexSkills(facts)?.[0].content).toContain(
      "mcp__seiri_read_only__get_value",
    );
    expect(buildCodexHooks(facts)).toEqual({
      hooks: { PostToolUse: [{ matcher: "Bash|mcp__seiri_tools__workflow" }] },
    });
  });

  it("composes MCP conversion before async handoff adaptation", () => {
    const facts = mcpToolFacts({
      skillFiles: {
        "x/SKILL.md":
          "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri_tools__gates\n<!-- ogham-async-agent:handoffs seiri -->\nClaude waiting\n<!-- ogham-async-agent:end -->",
      },
    });
    const content = buildCodexSkills(facts)?.[0].content;
    expect(content).toContain("mcp__seiri__gates");
    expect(content).toContain("wait_agent");
    expect(content).not.toContain("Claude waiting");
  });

  it("retains non-tool events and unrelated regex matchers", () => {
    const facts = mcpToolFacts({
      hooksFile: {
        hooks: {
          SessionStart: [{ matcher: "mcp__plugin_seiri_tools__workflow" }],
          PostToolUse: [
            { matcher: "^Other.*$|mcp__plugin_seiri_tools__workflow" },
          ],
        },
      },
    });
    expect(buildCodexHooks(facts)).toEqual({
      hooks: {
        SessionStart: [{ matcher: "mcp__plugin_seiri_tools__workflow" }],
        PostToolUse: [{ matcher: "^Other.*$|mcp__seiri__workflow" }],
      },
    });
  });

  it("preserves existing fallback and unsupported-tool removal", () => {
    const facts = mcpToolFacts({
      hooksFile: {
        hooks: {
          PreToolUse: [
            { matcher: "Read|Skill|mcp__plugin_seiri_tools__workflow" },
          ],
          PostToolUseFailure: [{ matcher: "Bash" }],
        },
      },
    });
    expect(buildCodexHooks(facts)).toEqual({
      hooks: {
        PreToolUse: [{ matcher: "Read|mcp__seiri__workflow|Bash" }],
      },
    });
  });

  it("is deterministic and leaves all canonical bytes intact", () => {
    const facts = mcpToolFacts();
    const before = structuredClone(facts);
    expect(buildCodexSkills(facts)).toEqual(buildCodexSkills(facts));
    expect(buildCodexPluginManifest(facts)).toEqual(
      buildCodexPluginManifest(facts),
    );
    expect(facts).toEqual(before);
  });
});
