import { win32 } from "node:path";

import { describe, expect, it } from "vitest";

import { anchorTargetPath } from "../read/canonicalizeTargetPathSync/anchorTargetPath.js";

describe("Windows unresolved target anchoring", () => {
  it("preserves relative components below the supplied directory", () => {
    expect(
      anchorTargetPath("D:\\root", "directory-alias\\..\\ordinary.md", win32),
    ).toBe("D:\\root\\directory-alias\\..\\ordinary.md");
  });

  it("anchors a root-relative target to the supplied drive", () => {
    expect(
      anchorTargetPath("D:\\root", "\\directory-alias\\..\\ordinary.md", win32),
    ).toBe("D:\\directory-alias\\..\\ordinary.md");
  });

  it("preserves an absolute target on another drive", () => {
    expect(
      anchorTargetPath(
        "D:\\root",
        "C:\\directory-alias\\..\\ordinary.md",
        win32,
      ),
    ).toBe("C:\\directory-alias\\..\\ordinary.md");
  });

  it("preserves the UNC share root and unresolved components", () => {
    const target = "\\\\server\\share\\directory-alias\\..\\ordinary.md";

    expect(anchorTargetPath("D:\\root", target, win32)).toBe(target);
  });
});
