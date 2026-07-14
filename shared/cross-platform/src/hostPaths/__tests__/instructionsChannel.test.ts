import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { instructionsFile, ruleDocsTarget } from "../instructionsChannel.js";

beforeEach(() => {
  delete process.env.OGHAM_HOST;
});

afterEach(() => {
  delete process.env.OGHAM_HOST;
});

describe("instructionsFile", () => {
  it("keeps CLAUDE.md on Claude — the channel that works today must not move", () => {
    expect(instructionsFile()).toBe("CLAUDE.md");
  });

  it("switches to AGENTS.md on Codex, which never reads CLAUDE.md", () => {
    process.env.OGHAM_HOST = "codex";
    expect(instructionsFile()).toBe("AGENTS.md");
  });

  it("leaves agy on Claude's file — its channel is unmeasured, and guessing would claim support we lack", () => {
    process.env.OGHAM_HOST = "agy";
    expect(instructionsFile()).toBe("CLAUDE.md");
  });
});

describe("ruleDocsTarget", () => {
  it("hands Claude the rules directory it already reads", () => {
    expect(ruleDocsTarget()).toEqual({
      kind: "directory",
      path: ".claude/rules",
    });
  });

  it("collapses to a merge into AGENTS.md on Codex, which reads one file and no directory", () => {
    process.env.OGHAM_HOST = "codex";
    expect(ruleDocsTarget()).toEqual({ kind: "merge", file: "AGENTS.md" });
  });

  it("holds an unknown marker to the directory channel rather than merging into a file it cannot name", () => {
    process.env.OGHAM_HOST = "someFutureHost";
    expect(ruleDocsTarget()).toEqual({
      kind: "directory",
      path: ".claude/rules",
    });
  });
});
