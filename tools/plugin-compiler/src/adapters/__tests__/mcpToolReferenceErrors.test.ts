import { describe, expect, it } from "vitest";

import { buildCodexHooks } from "../builders/buildCodexHooks.js";
import { buildCodexMcpServers } from "../builders/buildCodexMcpServers.js";
import { buildCodexSkills } from "../builders/buildCodexSkills.js";
import { mcpToolFacts } from "./fixtures/mcpToolFacts.js";

describe("invalid MCP opt-in", () => {
  it.each([
    "<!-- ogham-mcp-tools:other -->",
    "<!-- ogham-mcp-tools seiri -->",
    "<!-- ogham-mcp-tools:seiri",
    "<!-- ogham-mcp-tools:seiri -->\n<!-- ogham-mcp-tools:seiri -->",
  ])("rejects the marker %s", (content) => {
    expect(() =>
      buildCodexSkills(mcpToolFacts({ skillFiles: { "x/SKILL.md": content } })),
    ).toThrow(/MCP.*marker/i);
  });

  it("rejects an unknown owned server", () => {
    expect(() =>
      buildCodexSkills(
        mcpToolFacts({
          skillFiles: {
            "x/SKILL.md":
              "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri_missing__gates",
          },
        }),
      ),
    ).toThrow(/server/i);
  });

  it("rejects colliding normalized servers", () => {
    expect(() =>
      buildCodexSkills(
        mcpToolFacts({
          mcpServers: {
            "read-only": { command: "node", args: [] },
            read_only: { command: "node", args: [] },
          },
        }),
      ),
    ).toThrow(/collid/i);
  });

  it("rejects tool collisions across marked files", () => {
    expect(() =>
      buildCodexSkills(
        mcpToolFacts({
          skillFiles: {
            "a/SKILL.md":
              "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri_tools__read-only",
            "b/SKILL.md":
              "<!-- ogham-mcp-tools:seiri -->\nmcp__plugin_seiri_tools__read_only",
          },
        }),
      ),
    ).toThrow(/collid/i);
  });

  it.each([
    "^mcp__plugin_seiri_tools__workflow$",
    "mcp__plugin_seiri_tools__.*",
    "mcp__plugin_seiri_tools__(start|finish)",
  ])("rejects an owned compound hook matcher %s", (matcher) => {
    expect(() =>
      buildCodexHooks(
        mcpToolFacts({ hooksFile: { hooks: { PostToolUse: [{ matcher }] } } }),
      ),
    ).toThrow(/exact.*MCP|MCP.*exact/i);
  });

  it("does not validate unmarked foreign plugin regexes", () => {
    expect(
      buildCodexHooks(
        mcpToolFacts({
          skillFiles: {},
          hooksFile: {
            hooks: {
              PostToolUse: [{ matcher: "^mcp__plugin_seiri_tools__.*$" }],
            },
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects absent MCP declarations for an owned reference", () => {
    expect(() => buildCodexSkills(mcpToolFacts({ mcpServers: null }))).toThrow(
      /server/i,
    );
  });

  it("does not emit colliding marked servers through the MCP-only builder", () => {
    expect(() =>
      buildCodexMcpServers(
        mcpToolFacts({
          mcpServers: {
            "read-only": { command: "node", args: [] },
            read_only: { command: "node", args: [] },
          },
        }),
      ),
    ).toThrow(/collid/i);
  });

  it("rejects unsupported declared server characters", () => {
    expect(() =>
      buildCodexSkills(
        mcpToolFacts({
          mcpServers: {
            "read.only": { command: "node", args: [] },
          },
        }),
      ),
    ).toThrow(/Unsupported MCP server/);
  });
});
