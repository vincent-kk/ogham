import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type TestContext,
} from "vitest";

import { canonicalizeTargetPathSync } from "../index.js";

/** Existing root and explicit skip mechanism supplied by the test lifecycle. */
let root: string;
/** Current case's skip mechanism for unsupported symlink fixtures. */
let skipUnsupported: TestContext["skip"];
/** Host errors indicating that symlink fixtures are unavailable. */
const UNSUPPORTED_SYMLINK_CODES = new Set(["EPERM", "ENOSYS", "ENOTSUP"]);

/**
 * Create a link whose target may not exist on the host filesystem.
 * @param target - Relative or absolute link target stored by the filesystem.
 * @param alias - Unused link entry in the isolated fixture directory.
 * @param type - Host symlink kind for file or directory fixtures.
 * @param skip - Vitest's explicit unsupported-host result mechanism.
 * @returns Nothing; unrelated filesystem failures propagate.
 */
function createSymlink(
  target: string,
  alias: string,
  type: "file" | "dir",
  skip: TestContext["skip"],
): void {
  try {
    symlinkSync(target, alias, type);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "";
    if (!UNSUPPORTED_SYMLINK_CODES.has(code)) throw error;
    skip("The host filesystem cannot create these symlink fixtures.");
  }
}

beforeEach(({ skip }) => {
  root = mkdtempSync(join(tmpdir(), "ogham-canonical-target-"));
  skipUnsupported = skip;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("canonical targets with missing referents", () => {
  it.each(["relative", "absolute"])(
    "follows a dangling terminal symlink with a %s target",
    (targetKind) => {
      const child = join(root, "child");
      mkdirSync(child);
      const target = join(child, "INTENT.md");
      const alias = join(root, "draft.md");
      createSymlink(
        targetKind === "absolute" ? target : "child/INTENT.md",
        alias,
        "file",
        skipUnsupported,
      );

      expect(canonicalizeTargetPathSync(root, alias)).toBe(
        join(realpathSync.native(child), "INTENT.md"),
      );
    },
  );

  it("follows chained symlinks to a missing ordinary file", ({ skip }) => {
    const first = join(root, "first.md");
    const second = join(root, "second.md");
    createSymlink("second.md", first, "file", skip);
    createSymlink(join(root, "ordinary.md"), second, "file", skip);

    expect(canonicalizeTargetPathSync(root, first)).toBe(
      join(realpathSync.native(root), "ordinary.md"),
    );
  });

  it("resolves a relative dangling target beneath a parent alias", ({
    skip,
  }) => {
    const physical = join(root, "physical");
    const parentAlias = join(root, "parent-alias");
    mkdirSync(physical);
    createSymlink(physical, parentAlias, "dir", skip);
    createSymlink("INTENT.md", join(physical, "draft.md"), "file", skip);

    expect(
      canonicalizeTargetPathSync(root, join(parentAlias, "draft.md")),
    ).toBe(join(realpathSync.native(physical), "INTENT.md"));
  });

  it("resolves parent-relative targets from the physical parent directory", ({
    skip,
  }) => {
    const physical = join(root, "physical");
    const deep = join(physical, "deep");
    const destination = join(physical, "new");
    const parentAlias = join(root, "parent-alias");
    mkdirSync(deep, { recursive: true });
    mkdirSync(destination);
    createSymlink(deep, parentAlias, "dir", skip);
    createSymlink("../new/INTENT.md", join(deep, "draft.md"), "file", skip);

    expect(
      canonicalizeTargetPathSync(root, join(parentAlias, "draft.md")),
    ).toBe(join(realpathSync.native(destination), "INTENT.md"));
  });

  it.each(["link target", "input path"])(
    "resolves a directory alias before parent traversal in the %s",
    (inputKind) => {
      const physical = join(root, "physical");
      const nested = join(physical, "nested");
      mkdirSync(nested, { recursive: true });
      createSymlink(
        nested,
        join(root, "directory-alias"),
        "dir",
        skipUnsupported,
      );
      createSymlink(
        "INTENT.md",
        join(physical, "ordinary.md"),
        "file",
        skipUnsupported,
      );
      const unresolved = "directory-alias/../ordinary.md";
      const draft = join(root, "draft.md");
      createSymlink(unresolved, draft, "file", skipUnsupported);
      const input = inputKind === "link target" ? draft : unresolved;
      const actualTarget = join(realpathSync.native(physical), "INTENT.md");

      const canonical = canonicalizeTargetPathSync(root, input);
      writeFileSync(draft, "created through the physical target");

      expect(realpathSync.native(draft)).toBe(actualTarget);
      expect(canonical).toBe(actualTarget);
    },
  );

  it("keeps the unresolved suffix after a dangling ancestor link", ({
    skip,
  }) => {
    const alias = join(root, "directory-alias");
    createSymlink("missing-directory", alias, "dir", skip);

    expect(canonicalizeTargetPathSync(root, join(alias, "child.md"))).toBe(
      join(realpathSync.native(root), "missing-directory", "child.md"),
    );
  });

  it("preserves ordinary missing path components without inventing an alias", () => {
    expect(
      canonicalizeTargetPathSync(root, join("missing", "ordinary.md")),
    ).toBe(join(realpathSync.native(root), "missing", "ordinary.md"));
  });

  it.each(["draft.md", "INTENT.md"])(
    "preserves the dangling terminal entry %s for unlink",
    (entry) => {
      const physical = join(root, "physical");
      const parentAlias = join(root, "parent-alias");
      mkdirSync(physical);
      createSymlink(physical, parentAlias, "dir", skipUnsupported);
      createSymlink(
        "missing.md",
        join(physical, entry),
        "file",
        skipUnsupported,
      );

      expect(
        canonicalizeTargetPathSync(root, join(parentAlias, entry), {
          preserveTerminalEntry: true,
        }),
      ).toBe(join(realpathSync.native(physical), entry));
    },
  );

  it("propagates the host error for a symlink cycle", ({ skip }) => {
    const first = join(root, "first.md");
    const second = join(root, "second.md");
    createSymlink("second.md", first, "file", skip);
    createSymlink("first.md", second, "file", skip);

    expect(() => canonicalizeTargetPathSync(root, first)).toThrow(
      expect.objectContaining({ code: "ELOOP" }),
    );
  });

  it("propagates the host error for a cycle through a parent alias", ({
    skip,
  }) => {
    const alias = join(root, "loop.md");
    createSymlink(root, join(root, "hop"), "dir", skip);
    createSymlink("hop/loop.md", alias, "file", skip);

    expect(() => realpathSync.native(alias)).toThrow(
      expect.objectContaining({ code: "ELOOP" }),
    );
    expect(() => canonicalizeTargetPathSync(root, alias)).toThrow(
      expect.objectContaining({ code: "ELOOP" }),
    );
  });
});
