import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as targetModule from "../targets.js";

const { resolveProjectTargets } = targetModule;
const projectResolvers = targetModule as typeof targetModule & {
  readonly resolveProjectRuleTarget?: (
    options: Parameters<typeof resolveProjectTargets>[0],
  ) => ReturnType<typeof resolveProjectTargets>["rules"];
  readonly resolveProjectInstructionTarget?: (
    options: Parameters<typeof resolveProjectTargets>[0],
  ) => ReturnType<typeof resolveProjectTargets>["instructions"];
  readonly resolveProjectMcpTarget?: (
    options: Parameters<typeof resolveProjectTargets>[0],
  ) => ReturnType<typeof resolveProjectTargets>["mcp"];
};

describe("resolveProjectTargets", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-targets-project-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("rejects a relative project root", () => {
    expect(() =>
      resolveProjectTargets({ host: "claude", projectRoot: "relative" }),
    ).toThrow(/absolute/i);
  });

  it("maps Claude project artifacts to rules, instructions, and JSON MCP", () => {
    expect(
      resolveProjectTargets({ host: "claude", projectRoot: root }),
    ).toMatchObject({
      scope: "project",
      host: "claude",
      root,
      rules: {
        kind: "directory",
        directoryPath: join(root, ".claude", "rules"),
      },
      instructions: {
        kind: "sections",
        effectivePath: join(root, "CLAUDE.md"),
        candidatePaths: [
          join(root, "CLAUDE.md"),
          join(root, ".claude", "CLAUDE.md"),
        ],
      },
      mcp: {
        kind: "json-file",
        path: join(root, ".mcp.json"),
      },
    });
  });

  it("maps Codex project artifacts to AGENTS sections and TOML MCP", () => {
    expect(
      resolveProjectTargets({ host: "codex", projectRoot: root }),
    ).toMatchObject({
      scope: "project",
      host: "codex",
      root,
      rules: {
        kind: "sections",
        effectivePath: join(root, "AGENTS.md"),
        candidatePaths: [
          join(root, "AGENTS.override.md"),
          join(root, "AGENTS.md"),
        ],
      },
      instructions: {
        kind: "sections",
        effectivePath: join(root, "AGENTS.md"),
      },
      mcp: {
        kind: "toml-file",
        path: join(root, ".codex", "config.toml"),
      },
    });
  });

  it("selects only a non-empty Codex override as effective", () => {
    const overridePath = join(root, "AGENTS.override.md");
    writeFileSync(overridePath, " \n");
    expect(
      resolveProjectTargets({ host: "codex", projectRoot: root }).instructions
        .effectivePath,
    ).toBe(join(root, "AGENTS.md"));

    writeFileSync(overridePath, "# Override\n");
    const targets = resolveProjectTargets({
      host: "codex",
      projectRoot: root,
    });
    expect(targets.instructions.effectivePath).toBe(overridePath);
    expect(targets.rules).toMatchObject({ effectivePath: overridePath });
  });

  it("resolves project rules without requiring an aggregate target set", () => {
    expect(projectResolvers.resolveProjectRuleTarget).toBeTypeOf("function");
    expect(
      projectResolvers.resolveProjectRuleTarget?.({
        host: "claude",
        projectRoot: root,
      }),
    ).toEqual(
      resolveProjectTargets({ host: "claude", projectRoot: root }).rules,
    );
  });

  it("resolves project instructions without requiring an aggregate target set", () => {
    expect(projectResolvers.resolveProjectInstructionTarget).toBeTypeOf(
      "function",
    );
    expect(
      projectResolvers.resolveProjectInstructionTarget?.({
        host: "codex",
        projectRoot: root,
      }),
    ).toEqual(
      resolveProjectTargets({ host: "codex", projectRoot: root }).instructions,
    );
  });

  it("resolves project MCP without reading instruction candidates", () => {
    const unreadableOverride = join(root, "AGENTS.override.md");
    mkdirSync(unreadableOverride);

    expect(projectResolvers.resolveProjectMcpTarget).toBeTypeOf("function");
    expect(() =>
      projectResolvers.resolveProjectMcpTarget?.({
        host: "codex",
        projectRoot: root,
      }),
    ).not.toThrow();
  });
});
