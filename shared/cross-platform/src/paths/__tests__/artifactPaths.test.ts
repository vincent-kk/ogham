import { homedir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hostStateRoot, resolveContainedPath } from "../paths.js";

describe("hostStateRoot", () => {
  it("uses the host default below home when no relocation is present", () => {
    expect(hostStateRoot("claude", {})).toBe(join(homedir(), ".claude"));
    expect(hostStateRoot("codex", {})).toBe(join(homedir(), ".codex"));
  });

  it("honors each host relocation env and agy's explicit borrowed channel", () => {
    expect(
      hostStateRoot("claude", { CLAUDE_CONFIG_DIR: "/state/claude" }),
    ).toBe("/state/claude");
    expect(hostStateRoot("codex", { CODEX_HOME: "/state/codex" })).toBe(
      "/state/codex",
    );
    expect(hostStateRoot("agy", { CLAUDE_CONFIG_DIR: "/state/shared" })).toBe(
      "/state/shared",
    );
  });
});

describe("resolveContainedPath", () => {
  it("resolves POSIX descendants inside an absolute root", () => {
    expect(resolveContainedPath("/repo", ".claude", "rules", "a.md")).toBe(
      "/repo/.claude/rules/a.md",
    );
  });

  it("resolves Windows descendants independently of the runtime OS", () => {
    expect(resolveContainedPath("C:\\repo", ".claude", "rules", "a.md")).toBe(
      "C:\\repo\\.claude\\rules\\a.md",
    );
  });

  it("rejects a relative root", () => {
    expect(() => resolveContainedPath("repo", "a.md")).toThrow(/absolute/i);
  });

  it("rejects absolute path segments", () => {
    expect(() => resolveContainedPath("/repo", "/outside")).toThrow(
      /absolute/i,
    );
    expect(() => resolveContainedPath("C:\\repo", "D:\\outside")).toThrow(
      /absolute/i,
    );
  });

  it("rejects traversal components in either separator style", () => {
    expect(() => resolveContainedPath("/repo", "a/../outside")).toThrow(
      /traversal/i,
    );
    expect(() => resolveContainedPath("C:\\repo", "a\\..\\outside")).toThrow(
      /traversal/i,
    );
  });
});
