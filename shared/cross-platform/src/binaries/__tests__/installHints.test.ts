import { afterEach, describe, expect, it } from "vitest";
import { installHints } from "../installHints.js";

describe("installHints", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  function stub(value: NodeJS.Platform) {
    Object.defineProperty(process, "platform", { value, configurable: true });
  }

  it("returns winget command + link on win32", () => {
    stub("win32");
    const hint = installHints("node");
    expect(hint).toContain("winget install OpenJS.NodeJS");
    expect(hint).toContain("https://nodejs.org/");
  });

  it("returns brew command on macOS", () => {
    stub("darwin");
    expect(installHints("node")).toContain("brew install node");
  });

  it("returns distro hint on linux", () => {
    stub("linux");
    expect(installHints("node")).toContain("distro");
  });

  it("returns undefined for an unknown bin", () => {
    stub("darwin");
    expect(installHints("unknown-bin")).toBeUndefined();
  });

  it("includes git-specific commands per platform", () => {
    stub("win32");
    expect(installHints("git")).toContain("Git.Git");
    stub("darwin");
    expect(installHints("git")).toContain("xcode-select");
  });
});
