import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyFilePlan, createRevision } from "../transactions.js";

describe("file transactions", () => {
  let root: string;
  let target: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-transactions-"));
    target = join(root, "AGENTS.md");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates a stable revision over paths regardless of input order", () => {
    const other = join(root, "other");
    writeFileSync(target, "one");
    writeFileSync(other, "two");

    expect(createRevision([target, other])).toBe(
      createRevision([other, target]),
    );
    expect(createRevision([target])).not.toBe(createRevision([other]));
  });

  it("applies changes only when the expected revision still matches", () => {
    writeFileSync(target, "before");
    const expectedRevision = createRevision([target]);

    expect(
      applyFilePlan({
        expectedRevision,
        revisionPaths: [target],
        lockTarget: target,
        changes: [{ targetPath: target, content: "after", root }],
      }),
    ).toEqual({ status: "applied", applied: [target] });
    expect(readFileSync(target, "utf8")).toBe("after");
  });

  it("rejects a stale plan without overwriting the newer bytes", () => {
    writeFileSync(target, "previewed");
    const expectedRevision = createRevision([target]);
    writeFileSync(target, "user edit");

    expect(
      applyFilePlan({
        expectedRevision,
        revisionPaths: [target],
        lockTarget: target,
        changes: [{ targetPath: target, content: "planned", root }],
      }),
    ).toEqual({ status: "conflict", reason: "revision", applied: [] });
    expect(readFileSync(target, "utf8")).toBe("user edit");
  });

  it("returns a lock conflict without running file changes", () => {
    writeFileSync(target, "before");
    mkdirSync(`${target}.lock`);

    expect(
      applyFilePlan({
        expectedRevision: createRevision([target]),
        revisionPaths: [target],
        lockTarget: target,
        lockOptions: { timeoutMs: 0, staleMs: 60_000 },
        changes: [{ targetPath: target, content: "after", root }],
      }),
    ).toEqual({ status: "conflict", reason: "lock", applied: [] });
    expect(readFileSync(target, "utf8")).toBe("before");
  });

  it("writes a sibling backup from the locked pre-change bytes", () => {
    const backupPath = `${target}.bak`;
    writeFileSync(target, "original");
    const revisionPaths = [target, backupPath];

    expect(
      applyFilePlan({
        expectedRevision: createRevision(revisionPaths),
        revisionPaths,
        lockTarget: target,
        changes: [
          {
            targetPath: target,
            content: "replacement",
            backupPath,
            root,
          },
        ],
      }),
    ).toEqual({ status: "applied", applied: [target] });
    expect(readFileSync(backupPath, "utf8")).toBe("original");
  });
});
