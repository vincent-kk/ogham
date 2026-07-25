import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as targetModule from "../targets.js";

const { resolveUserTargets } = targetModule;
const userResolvers = targetModule as typeof targetModule & {
  readonly resolveUserRuleTarget?: (
    options: Parameters<typeof resolveUserTargets>[0],
  ) => ReturnType<typeof resolveUserTargets>["rules"];
  readonly resolveUserInstructionTarget?: (
    options: Parameters<typeof resolveUserTargets>[0],
  ) => ReturnType<typeof resolveUserTargets>["instructions"];
  readonly resolveUserMcpTarget?: (
    options: Parameters<typeof resolveUserTargets>[0],
  ) => ReturnType<typeof resolveUserTargets>["mcp"];
};

describe("resolveUserTargets", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-targets-user-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("uses CLAUDE_CONFIG_DIR without accepting an output root", () => {
    expect(
      resolveUserTargets({
        host: "claude",
        env: { CLAUDE_CONFIG_DIR: root },
      }),
    ).toMatchObject({
      scope: "user",
      host: "claude",
      root,
      rules: {
        kind: "directory",
        directoryPath: join(root, "rules"),
      },
      instructions: {
        kind: "sections",
        effectivePath: join(root, "CLAUDE.md"),
      },
      mcp: {
        kind: "cli",
        command: "claude",
        scope: "user",
      },
    });
  });

  it("uses CODEX_HOME for AGENTS sections and the Codex CLI", () => {
    expect(
      resolveUserTargets({ host: "codex", env: { CODEX_HOME: root } }),
    ).toMatchObject({
      scope: "user",
      host: "codex",
      root,
      rules: {
        kind: "sections",
        effectivePath: join(root, "AGENTS.md"),
      },
      instructions: {
        kind: "sections",
        effectivePath: join(root, "AGENTS.md"),
      },
      mcp: {
        kind: "cli",
        command: "codex",
        scope: "user",
      },
    });
  });

  it("relocates both Codex section targets to a non-empty override", () => {
    const overridePath = join(root, "AGENTS.override.md");
    mkdirSync(root, { recursive: true });
    writeFileSync(overridePath, "# User override\n");

    const targets = resolveUserTargets({
      host: "codex",
      env: { CODEX_HOME: root },
    });

    expect(targets.instructions.effectivePath).toBe(overridePath);
    expect(targets.rules).toMatchObject({ effectivePath: overridePath });
  });

  it("resolves user rules without requiring an aggregate target set", () => {
    const options = {
      host: "claude" as const,
      env: { CLAUDE_CONFIG_DIR: root },
    };

    expect(userResolvers.resolveUserRuleTarget).toBeTypeOf("function");
    expect(userResolvers.resolveUserRuleTarget?.(options)).toEqual(
      resolveUserTargets(options).rules,
    );
  });

  it("resolves user instructions without requiring an aggregate target set", () => {
    const options = { host: "codex" as const, env: { CODEX_HOME: root } };

    expect(userResolvers.resolveUserInstructionTarget).toBeTypeOf("function");
    expect(userResolvers.resolveUserInstructionTarget?.(options)).toEqual(
      resolveUserTargets(options).instructions,
    );
  });

  it("resolves user MCP without reading instruction candidates", () => {
    const unreadableOverride = join(root, "AGENTS.override.md");
    mkdirSync(unreadableOverride);

    expect(userResolvers.resolveUserMcpTarget).toBeTypeOf("function");
    expect(() =>
      userResolvers.resolveUserMcpTarget?.({
        host: "codex",
        env: { CODEX_HOME: root },
      }),
    ).not.toThrow();
  });
});
