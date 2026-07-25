import { describe, expect, it } from "vitest";

import { requireAbsoluteRoot } from "../absoluteRoot.js";

describe("requireAbsoluteRoot", () => {
  it("accepts and normalizes a POSIX absolute path", () => {
    expect(requireAbsoluteRoot("/repo/sub/..")).toBe("/repo");
  });

  it("accepts and normalizes a Windows absolute path on every runtime OS", () => {
    expect(requireAbsoluteRoot("C:\\repo\\sub\\..")).toBe("C:\\repo");
  });

  it("rejects relative and drive-relative paths", () => {
    expect(() => requireAbsoluteRoot("../repo")).toThrow(/absolute/i);
    expect(() => requireAbsoluteRoot("C:repo")).toThrow(/absolute/i);
  });
});
