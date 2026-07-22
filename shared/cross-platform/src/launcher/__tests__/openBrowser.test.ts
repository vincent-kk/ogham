import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("cross-spawn", () => ({
  default: spawnMock,
}));

import { NO_BROWSER_ENV, openBrowser } from "../openBrowser.js";

describe("openBrowser", () => {
  const originalPlatform = process.platform;

  function stubPlatform(value: NodeJS.Platform) {
    Object.defineProperty(process, "platform", { value, configurable: true });
  }

  function fakeChild() {
    return { on: vi.fn(), unref: vi.fn() };
  }

  beforeEach(() => {
    spawnMock.mockReset();
    spawnMock.mockReturnValue(fakeChild());
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it(`launches nothing when ${NO_BROWSER_ENV} is set`, () => {
    // The switch exists because an unmocked call in a test run opens a real tab
    // on the developer's machine. Any non-empty value counts — the old
    // per-plugin variables demanded exactly "1", a rule to get wrong for no gain.
    const original = process.env[NO_BROWSER_ENV];
    stubPlatform("darwin");
    process.env[NO_BROWSER_ENV] = "1";
    try {
      openBrowser("http://127.0.0.1:1234");
      expect(spawnMock).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) delete process.env[NO_BROWSER_ENV];
      else process.env[NO_BROWSER_ENV] = original;
    }
  });

  it("uses `open` on darwin", () => {
    stubPlatform("darwin");
    openBrowser("http://127.0.0.1:1234");
    expect(spawnMock).toHaveBeenCalledWith(
      "open",
      ["http://127.0.0.1:1234"],
      expect.objectContaining({ stdio: "ignore", detached: true }),
    );
  });

  it('uses `cmd.exe /c start "" <url>` on win32', () => {
    stubPlatform("win32");
    openBrowser("http://127.0.0.1:1234");
    expect(spawnMock).toHaveBeenCalledWith(
      "cmd.exe",
      ["/c", "start", "", "http://127.0.0.1:1234"],
      expect.objectContaining({ stdio: "ignore", detached: true }),
    );
  });

  it("uses `xdg-open` on linux", () => {
    stubPlatform("linux");
    openBrowser("http://127.0.0.1:1234");
    expect(spawnMock).toHaveBeenCalledWith(
      "xdg-open",
      ["http://127.0.0.1:1234"],
      expect.objectContaining({ stdio: "ignore", detached: true }),
    );
  });

  it("swallows spawn errors (headless)", () => {
    stubPlatform("linux");
    spawnMock.mockImplementation(() => {
      throw new Error("ENOENT: xdg-open");
    });
    expect(() => openBrowser("http://127.0.0.1:1234")).not.toThrow();
  });

  it("attaches an error handler so unhandled child errors do not crash", () => {
    stubPlatform("darwin");
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    openBrowser("http://127.0.0.1:1234");
    expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(child.unref).toHaveBeenCalled();
  });
});
