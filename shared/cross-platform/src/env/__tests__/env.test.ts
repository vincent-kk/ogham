import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../env.js";

describe("env", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;
    if (originalUserProfile !== undefined) process.env.USERPROFILE = originalUserProfile;
    else delete process.env.USERPROFILE;
    vi.restoreAllMocks();
  });

  function stubPlatform(value: NodeJS.Platform) {
    Object.defineProperty(process, "platform", { value, configurable: true });
  }

  it("home() prefers HOME over USERPROFILE", () => {
    process.env.HOME = "/from/home";
    process.env.USERPROFILE = "C:\\from\\userprofile";
    expect(env.home()).toBe("/from/home");
  });

  it("home() falls back to USERPROFILE when HOME unset", () => {
    delete process.env.HOME;
    process.env.USERPROFILE = "C:\\Users\\test";
    expect(env.home()).toBe("C:\\Users\\test");
  });

  it("isWindows / isMacOS / isLinux reflect process.platform via getters", () => {
    stubPlatform("win32");
    expect(env.isWindows).toBe(true);
    expect(env.isMacOS).toBe(false);
    expect(env.isLinux).toBe(false);

    stubPlatform("darwin");
    expect(env.isMacOS).toBe(true);
    expect(env.isWindows).toBe(false);

    stubPlatform("linux");
    expect(env.isLinux).toBe(true);
    expect(env.isWindows).toBe(false);
  });

  it("pathDelimiter is ';' on win32, ':' otherwise", () => {
    stubPlatform("win32");
    expect(env.pathDelimiter).toBe(";");
    stubPlatform("darwin");
    expect(env.pathDelimiter).toBe(":");
    stubPlatform("linux");
    expect(env.pathDelimiter).toBe(":");
  });

  it("eol is '\\r\\n' on win32, '\\n' otherwise", () => {
    stubPlatform("win32");
    expect(env.eol).toBe("\r\n");
    stubPlatform("darwin");
    expect(env.eol).toBe("\n");
  });
});
