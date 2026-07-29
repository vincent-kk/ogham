import { describe, expect, it } from "vitest";

import {
  portableBasename,
  portableJoin,
  portableResolve,
  samePath,
} from "../index.js";

describe("portable path helpers", () => {
  describe("portableBasename", () => {
    it("uses Windows separators for drive-letter paths on POSIX runners", () => {
      expect(portableBasename("C:\\repo\\src\\file.ts")).toBe("file.ts");
    });

    it("uses Windows separators for UNC paths on POSIX runners", () => {
      expect(portableBasename("\\\\server\\share\\src\\file.ts")).toBe(
        "file.ts",
      );
    });

    it("keeps POSIX absolute paths on the POSIX path API", () => {
      expect(portableBasename("/repo/src/file.ts")).toBe("file.ts");
    });
  });

  describe("portableJoin", () => {
    it("joins drive-letter paths with Windows separators on POSIX runners", () => {
      expect(portableJoin("C:\\repo", "src", "file.ts")).toBe(
        "C:\\repo\\src\\file.ts",
      );
    });

    it("joins UNC paths with Windows separators on POSIX runners", () => {
      expect(portableJoin("\\\\server\\share", "src", "file.ts")).toBe(
        "\\\\server\\share\\src\\file.ts",
      );
    });

    it("joins POSIX absolute paths host-independently", () => {
      expect(portableJoin("/repo", "src", "file.ts")).toBe("/repo/src/file.ts");
    });

    it("takes the flavor from whichever part carries the signal", () => {
      // A flavorless segment beside a Windows root still joins with a
      // backslash. Callers that hand-build `${windowsPath}/name` instead get a
      // string that only matches on POSIX runners.
      expect(portableJoin("C:\\repo", "config.json")).toBe(
        "C:\\repo\\config.json",
      );
    });
  });

  describe("portableResolve", () => {
    it("resolves Windows drive-letter paths as Windows paths on POSIX runners", () => {
      expect(portableResolve("C:\\repo", "src\\file.ts")).toBe(
        "C:\\repo\\src\\file.ts",
      );
    });

    it("resolves POSIX absolute paths host-independently", () => {
      // Explicit POSIX flavor must short-circuit the native fallback so that
      // the result is identical on Windows, macOS, and Linux runners.
      expect(portableResolve("/repo", "src/file.ts")).toBe("/repo/src/file.ts");
    });
  });

  describe("samePath", () => {
    it("compares Windows-like paths case-insensitively", () => {
      expect(samePath("C:\\Project\\.filid", "c:\\project\\.filid")).toBe(true);
    });

    it("keeps POSIX path comparison case-sensitive", () => {
      expect(samePath("/Project/.filid", "/project/.filid")).toBe(false);
    });
  });
});
