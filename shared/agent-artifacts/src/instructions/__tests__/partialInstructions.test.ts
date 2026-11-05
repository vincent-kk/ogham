import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeSection, sectionMarkers } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstructionSectionManager } from "../instructions.js";

/** Selects a write to fail after any earlier target and backup writes succeed. */
const fault = vi.hoisted(() => ({
  path: "",
  unreadable: "",
  failReads: false,
}));
vi.mock("@ogham/cross-platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ogham/cross-platform")>();
  return {
    ...actual,
    readFileIfExistsSync: (
      ...args: Parameters<typeof actual.readFileIfExistsSync>
    ) => {
      if (fault.failReads && args[0] === fault.unreadable)
        throw new Error("cannot read revision");
      return actual.readFileIfExistsSync(...args);
    },
    writeFileAtomicallySync: (
      ...args: Parameters<typeof actual.writeFileAtomicallySync>
    ) => {
      if (args[0] === fault.path) {
        fault.failReads = true;
        throw new Error("disk full");
      }
      return actual.writeFileAtomicallySync(...args);
    },
  };
});

describe("instruction partial results", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "partial-instructions-"));
    fault.path = "";
    fault.unreadable = "";
    fault.failReads = false;
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reports incomplete relocation and the backup written before its failed cleanup", () => {
    const destination = join(root, "AGENTS.override.md");
    const source = join(root, "AGENTS.md");
    writeFileSync(source, mergeSection("", sectionMarkers("EXAMPLE"), "old"));
    const manager = createInstructionSectionManager({
      owner: "example",
      target: {
        kind: "sections",
        root,
        effectivePath: destination,
        candidatePaths: [destination, source],
        placement: "effective",
        lockTarget: join(root, "lock"),
      },
    });
    const plan = manager.plan({
      content: "new",
      replaceDrift: true,
      backup: "sibling",
    });
    fault.path = source;
    expect(manager.apply(plan)).toMatchObject({
      outcomes: [{ action: "partial" }],
      backupPaths: [`${source}.bak`],
      partialFailures: [
        {
          applied: [destination],
          failed: { target: source, error: "disk full" },
          notAttempted: [],
          backupPaths: [`${source}.bak`],
        },
      ],
    });
    expect(readFileSync(destination, "utf8")).toContain("new");
    expect(readFileSync(`${source}.bak`, "utf8")).toContain("old");
  });

  it("excludes planned backups that were never written", () => {
    const target = join(root, "AGENTS.md");
    writeFileSync(target, mergeSection("", sectionMarkers("EXAMPLE"), "old"));
    const manager = createInstructionSectionManager({
      owner: "example",
      target: {
        kind: "sections",
        root,
        effectivePath: target,
        candidatePaths: [target],
        placement: "effective",
        lockTarget: join(root, "lock"),
      },
    });
    const plan = manager.plan({
      content: "new",
      replaceDrift: true,
      backup: "sibling",
    });
    fault.path = `${target}.bak`;
    expect(manager.apply(plan)).toMatchObject({
      outcomes: [{ action: "partial" }],
      backupPaths: [],
      partialFailures: [
        {
          applied: [],
          failed: { target, error: "disk full" },
          backupPaths: [],
        },
      ],
    });
  });
  it("retains partial progress when a failed target cannot be re-read for its revision", () => {
    const target = join(root, "AGENTS.md");
    const manager = createInstructionSectionManager({
      owner: "example",
      target: {
        kind: "sections",
        root,
        effectivePath: target,
        candidatePaths: [target],
        placement: "effective",
        lockTarget: join(root, "lock"),
      },
    });
    const plan = manager.plan({ content: "new", replaceDrift: true });
    fault.path = target;
    fault.unreadable = target;
    expect(manager.apply(plan)).toMatchObject({
      outcomes: [{ action: "partial" }],
      revisions: [{ target, revision: null }],
      partialFailures: [{ failed: { target, error: "disk full" } }],
    });
  });
});
