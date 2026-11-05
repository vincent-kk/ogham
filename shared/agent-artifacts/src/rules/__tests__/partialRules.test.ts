import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeSection, sectionMarkers } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRuleDocumentManager } from "../rules.js";

/** Fails one physical target while leaving the other writes observable on disk. */
const fault = vi.hoisted(() => ({ path: "" }));
vi.mock("@ogham/cross-platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ogham/cross-platform")>();
  return {
    ...actual,
    removeFileIfExistsSync: (
      ...args: Parameters<typeof actual.removeFileIfExistsSync>
    ) => {
      if (args[0] === fault.path) throw new Error("disk full");
      return actual.removeFileIfExistsSync(...args);
    },
    writeFileAtomicallySync: (
      ...args: Parameters<typeof actual.writeFileAtomicallySync>
    ) => {
      if (args[0] === fault.path) throw new Error("disk full");
      return actual.writeFileAtomicallySync(...args);
    },
  };
});

describe("rule document partial results", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "partial-rules-"));
    fault.path = "";
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("keeps completed section outcomes and reports incomplete relocation and unattempted removal", () => {
    const effectivePath = join(root, "AGENTS.override.md");
    const fallback = join(root, "AGENTS.md");
    const later = join(root, "later.md");
    writeFileSync(
      fallback,
      mergeSection("", sectionMarkers("EXAMPLE", "move.md"), "move"),
    );
    writeFileSync(
      later,
      mergeSection("", sectionMarkers("EXAMPLE", "remove.md"), "remove"),
    );
    const manager = createRuleDocumentManager({
      owner: "example",
      target: {
        kind: "sections",
        root,
        effectivePath,
        candidatePaths: [effectivePath, fallback, later],
        placement: "effective",
        lockTarget: join(root, "lock"),
      },
    });
    const plan = manager.plan({
      documents: [
        { id: "copy", filename: "copy.md", content: "copy" },
        { id: "move", filename: "move.md", content: "move" },
        { id: "remove", filename: "remove.md", content: "remove" },
      ],
      desired: new Set(["copy", "move"]),
      replaceDrift: new Set(),
    });
    fault.path = fallback;
    const result = manager.apply(plan);
    expect(result.outcomes).toMatchObject([
      { id: "copy", action: "copy" },
      { id: "move", action: "partial" },
      { id: "remove", action: "partial" },
    ]);
    expect(result).toMatchObject({
      partialFailures: [
        {
          applied: [effectivePath],
          failed: { target: fallback, error: "disk full" },
          notAttempted: [later],
          backupPaths: [],
        },
      ],
    });
    expect(readFileSync(effectivePath, "utf8")).toContain("copy");
    expect(readFileSync(later, "utf8")).toContain("remove");
  });

  it("reports a directory relocation whose destination was written but source removal failed", () => {
    const legacy = join(root, "legacy.md");
    const destination = join(root, "example_move.md");
    writeFileSync(legacy, "move");
    const manager = createRuleDocumentManager({
      owner: "example",
      target: {
        kind: "directory",
        root,
        directoryPath: root,
        lockTarget: join(root, "lock"),
      },
    });
    const plan = manager.plan({
      documents: [
        {
          id: "move",
          filename: "example_move.md",
          legacyFilenames: ["legacy.md"],
          content: "move",
        },
      ],
      desired: new Set(["move"]),
      replaceDrift: new Set(),
    });
    fault.path = legacy;
    const result = manager.apply(plan);
    expect(result.outcomes).toMatchObject([{ action: "partial" }]);
    expect(result).toMatchObject({
      partialFailures: [
        {
          applied: [destination],
          failed: { target: legacy, error: "disk full" },
          notAttempted: [],
          backupPaths: [],
        },
      ],
    });
    expect(existsSync(destination)).toBe(true);
    expect(existsSync(legacy)).toBe(true);
  });
  it("distinguishes completed orphan removals from orphan cleanup blocked by a failed file", () => {
    const first = join(root, "AGENTS.override.md");
    const second = join(root, "AGENTS.md");
    for (const path of [first, second])
      writeFileSync(
        path,
        mergeSection("", sectionMarkers("EXAMPLE", "retired.md"), "retired"),
      );
    const manager = createRuleDocumentManager({
      owner: "example",
      target: {
        kind: "sections",
        root,
        effectivePath: first,
        candidatePaths: [first, second],
        placement: "effective",
        lockTarget: join(root, "lock"),
      },
    });
    const plan = manager.plan({
      documents: [],
      desired: new Set(),
      replaceDrift: new Set(),
    });
    fault.path = second;
    const result = manager.apply(plan);
    expect(result.outcomes).toMatchObject([
      { id: "retired.md", target: first, action: "remove" },
      { id: "retired.md", target: second, action: "partial" },
    ]);
    expect(result).toMatchObject({
      partialFailures: [
        { applied: [first], failed: { target: second, error: "disk full" } },
      ],
    });
  });
});
