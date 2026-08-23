import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertNoSymlinkDescendantsSync,
  canonicalizeTargetPathSync,
  ensureDirectorySync,
  listDirectoryIfExistsSync,
  readFileIfExistsSync,
  readUtf8FileIfExistsSync,
  removeFileIfExistsSync,
  withFileLockSync,
  writeFileAtomicallySync,
} from "../index.js";

describe("filesystem", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "ogham-filesystem-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns null only when a text or binary file is absent", () => {
    const path = join(root, "missing");

    expect(readUtf8FileIfExistsSync(path)).toBeNull();
    expect(readFileIfExistsSync(path)).toBeNull();
  });

  it("reads UTF-8 text and binary bytes without changing them", () => {
    const path = join(root, "data");
    writeFileSync(path, Uint8Array.from([0x61, 0x00, 0xff]));

    expect(readUtf8FileIfExistsSync(path)).toBe("a\u0000�");
    expect(Array.from(readFileIfExistsSync(path) ?? [])).toEqual([
      0x61, 0x00, 0xff,
    ]);
  });

  it("lists an existing directory and treats a missing one as empty", () => {
    writeFileSync(join(root, "b"), "");
    writeFileSync(join(root, "a"), "");

    expect([...listDirectoryIfExistsSync(root)].sort()).toEqual(["a", "b"]);
    expect(listDirectoryIfExistsSync(join(root, "missing"))).toEqual([]);
  });

  it("creates nested directories and removes only existing files", () => {
    const directory = join(root, "nested", "leaf");
    const file = join(directory, "value");

    ensureDirectorySync(directory);
    writeFileSync(file, "value");

    expect(removeFileIfExistsSync(file)).toBe(true);
    expect(removeFileIfExistsSync(file)).toBe(false);
  });

  it("atomically creates and replaces a file", () => {
    const path = join(root, "nested", "value");

    writeFileAtomicallySync(path, "first");
    writeFileAtomicallySync(
      path,
      Uint8Array.from([0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64]),
    );

    expect(readFileSync(path, "utf8")).toBe("second");
    expect(readdirSync(join(root, "nested"))).toEqual(["value"]);
  });

  it.skipIf(process.platform === "win32")(
    "preserves an existing file mode unless a replacement mode is explicit",
    () => {
      const path = join(root, "mode");
      writeFileSync(path, "old");
      chmodSync(path, 0o640);

      writeFileAtomicallySync(path, "same mode");
      expect(statSync(path).mode & 0o777).toBe(0o640);

      writeFileAtomicallySync(path, "new mode", { fileMode: 0o600 });
      expect(statSync(path).mode & 0o777).toBe(0o600);
    },
  );

  it("removes a sibling temporary file when replacement fails", () => {
    const targetDirectory = join(root, "target");
    mkdirSync(targetDirectory);

    expect(() => writeFileAtomicallySync(targetDirectory, "invalid")).toThrow();
    expect(readdirSync(root)).toEqual(["target"]);
  });

  it("runs an operation under a lock and returns its value", () => {
    const operation = vi.fn(() => 42);

    expect(withFileLockSync(join(root, "target"), operation)).toEqual({
      acquired: true,
      value: 42,
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(existsSync(join(root, "target.lock"))).toBe(false);
  });

  it("does not run the operation when a live lock reaches its timeout", () => {
    mkdirSync(join(root, "target.lock"));
    const operation = vi.fn();

    expect(
      withFileLockSync(join(root, "target"), operation, {
        timeoutMs: 0,
        staleMs: 60_000,
      }),
    ).toEqual({ acquired: false });
    expect(operation).not.toHaveBeenCalled();
  });

  it("quarantines a stale lock before acquiring a replacement", () => {
    const lockPath = join(root, "target.lock");
    mkdirSync(lockPath);
    writeFileSync(join(lockPath, "owner"), "abandoned");
    const staleTime = new Date(Date.now() - 60_000);
    utimesSync(lockPath, staleTime, staleTime);

    expect(
      withFileLockSync(join(root, "target"), () => "recovered", {
        timeoutMs: 50,
        staleMs: 1,
      }),
    ).toEqual({ acquired: true, value: "recovered" });
    expect(existsSync(lockPath)).toBe(false);
  });

  it("does not release a replacement lock owned by another writer", () => {
    const lockPath = join(root, "target.lock");

    const result = withFileLockSync(join(root, "target"), () => {
      const [ownerFile] = readdirSync(lockPath);
      rmSync(lockPath, { recursive: true });
      mkdirSync(lockPath);
      writeFileSync(join(lockPath, ownerFile), "replacement");
      return "lost";
    });

    expect(result).toEqual({ acquired: true, value: "lost" });
    expect(existsSync(lockPath)).toBe(true);
  });

  it("rejects existing symlink descendants but trusts the supplied root", () => {
    const realRoot = join(root, "real");
    const outside = join(root, "outside");
    const linkedRoot = join(root, "linked-root");
    mkdirSync(realRoot);
    mkdirSync(outside);
    symlinkSync(realRoot, linkedRoot, "dir");
    symlinkSync(outside, join(realRoot, "escape"), "dir");

    expect(() =>
      assertNoSymlinkDescendantsSync(
        linkedRoot,
        join(linkedRoot, "new", "file"),
      ),
    ).not.toThrow();
    expect(() =>
      assertNoSymlinkDescendantsSync(
        realRoot,
        join(realRoot, "escape", "file"),
      ),
    ).toThrow(/symbolic link/i);
  });

  it("canonicalizes host aliases while optionally preserving the terminal entry", () => {
    const core = join(root, "01_Core");
    const linkedCore = join(root, "core-link");
    const safeDir = join(root, "L3");
    const safeTarget = join(safeDir, "target.md");
    const terminalLink = join(root, "terminal-link.md");
    const protectedDocument = join(root, "INTENT.md");
    const documentCaseAlias = join(root, "intent.md");
    mkdirSync(core);
    mkdirSync(safeDir);
    writeFileSync(join(core, "identity.md"), "identity");
    writeFileSync(safeTarget, "safe");
    writeFileSync(protectedDocument, "contract");
    symlinkSync(core, linkedCore, "dir");
    symlinkSync(safeTarget, terminalLink, "file");

    const caseAlias = join(root, "01_core", "identity.md");
    expect(canonicalizeTargetPathSync(root, caseAlias)).toBe(
      existsSync(caseAlias)
        ? realpathSync.native(caseAlias)
        : join(realpathSync.native(root), "01_core", "identity.md"),
    );
    expect(canonicalizeTargetPathSync(root, join(linkedCore, "new.md"))).toBe(
      join(realpathSync.native(core), "new.md"),
    );
    expect(canonicalizeTargetPathSync(root, terminalLink)).toBe(
      realpathSync.native(safeTarget),
    );
    expect(
      canonicalizeTargetPathSync(root, terminalLink, {
        preserveTerminalEntry: true,
      }),
    ).toBe(join(realpathSync.native(root), "terminal-link.md"));
    expect(
      canonicalizeTargetPathSync(root, documentCaseAlias, {
        preserveTerminalEntry: true,
      }),
    ).toBe(
      existsSync(documentCaseAlias)
        ? join(realpathSync.native(root), "INTENT.md")
        : join(realpathSync.native(root), "intent.md"),
    );
    expect(
      canonicalizeTargetPathSync(root, join(linkedCore, "new.md"), {
        preserveTerminalEntry: true,
      }),
    ).toBe(join(realpathSync.native(core), "new.md"));
  });

  it("preserves non-ENOENT realpath errors", () => {
    // A file used as a directory component is ENOTDIR on POSIX but ENOENT on
    // Windows, so the rethrow branch is driven by an injected error instead.
    const denied = Object.assign(new Error("denied"), { code: "EACCES" });
    const realpath = vi.spyOn(realpathSync, "native").mockImplementation(() => {
      throw denied;
    });

    try {
      expect(() =>
        canonicalizeTargetPathSync(root, join(root, "child.md")),
      ).toThrow(denied);
    } finally {
      realpath.mockRestore();
    }
  });
});
