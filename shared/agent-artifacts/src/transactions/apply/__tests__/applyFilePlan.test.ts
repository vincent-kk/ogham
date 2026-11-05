import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRevision } from "../../planning/createRevision.js";
import { applyFilePlan } from "../applyFilePlan.js";

/** Injects an I/O failure while retaining real atomic writes for other paths. */
const fault = vi.hoisted(() => ({ path: "", writes: [] as string[] }));
vi.mock("@ogham/cross-platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ogham/cross-platform")>();
  return {
    ...actual,
    writeFileAtomicallySync: (
      ...args: Parameters<typeof actual.writeFileAtomicallySync>
    ) => {
      fault.writes.push(args[0]);
      if (args[0] === fault.path) throw new Error("disk full");
      return actual.writeFileAtomicallySync(...args);
    },
  };
});

describe("file plan partial failures", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "partial-files-"));
    fault.path = "";
    fault.writes = [];
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("returns completed paths and every written backup and stops before later files", () => {
    const paths = ["first", "second", "third"].map((name) => join(root, name));
    for (const path of paths) writeFileSync(path, "old");
    fault.path = paths[1];
    const result = applyFilePlan({
      expectedRevision: createRevision(paths),
      revisionPaths: paths,
      lockTarget: join(root, "lock"),
      changes: paths.map((targetPath) => ({
        targetPath,
        root,
        content: "new",
        backupPath: `${targetPath}.bak`,
      })),
    });
    expect(result).toEqual({
      status: "partial",
      applied: [paths[0]],
      failed: { target: paths[1], error: "disk full" },
      notAttempted: [paths[2]],
      backupPaths: [`${paths[0]}.bak`, `${paths[1]}.bak`],
    });
    expect(paths.map((path) => readFileSync(path, "utf8"))).toEqual([
      "new",
      "old",
      "old",
    ]);
    expect(readFileSync(`${paths[1]}.bak`, "utf8")).toBe("old");
    expect(existsSync(`${paths[2]}.bak`)).toBe(false);
    expect(fault.writes).not.toContain(paths[2]);
  });

  it("does not claim a failed backup or attempt its target", () => {
    const target = join(root, "target");
    const backup = `${target}.bak`;
    writeFileSync(target, "old");
    fault.path = backup;
    expect(
      applyFilePlan({
        expectedRevision: createRevision([target]),
        revisionPaths: [target],
        lockTarget: target,
        changes: [
          { targetPath: target, root, content: "new", backupPath: backup },
        ],
      }),
    ).toEqual({
      status: "partial",
      applied: [],
      failed: { target, error: "disk full" },
      notAttempted: [],
      backupPaths: [],
    });
    expect(fault.writes).toEqual([backup]);
    expect(readFileSync(target, "utf8")).toBe("old");
  });

  it("does not invent a backup when the original target was absent", () => {
    const target = join(root, "missing");
    fault.path = target;
    expect(
      applyFilePlan({
        expectedRevision: createRevision([target]),
        revisionPaths: [target],
        lockTarget: target,
        changes: [
          {
            targetPath: target,
            root,
            content: "new",
            backupPath: `${target}.bak`,
          },
        ],
      }),
    ).toEqual({
      status: "partial",
      applied: [],
      failed: { target, error: "disk full" },
      notAttempted: [],
      backupPaths: [],
    });
    expect(existsSync(`${target}.bak`)).toBe(false);
  });
});
