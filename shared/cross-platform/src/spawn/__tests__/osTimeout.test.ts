import { afterEach, describe, expect, it } from "vitest";
import { osTimeout } from "../osTimeout.js";

describe("osTimeout", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  function stubPlatform(value: NodeJS.Platform) {
    Object.defineProperty(process, "platform", { value, configurable: true });
  }

  it("returns ms unchanged on non-windows platforms", () => {
    stubPlatform("darwin");
    expect(osTimeout(2000)).toBe(2000);
    stubPlatform("linux");
    expect(osTimeout(1500)).toBe(1500);
  });

  it("triples ms on win32 when triple is above floor", () => {
    stubPlatform("win32");
    expect(osTimeout(3000)).toBe(9000);
    expect(osTimeout(10000)).toBe(30000);
  });

  it("floors to 5000 on win32 when triple is below 5000", () => {
    stubPlatform("win32");
    expect(osTimeout(500)).toBe(5000);
    expect(osTimeout(1500)).toBe(5000);
    expect(osTimeout(1666)).toBe(5000);
  });

  it("crosses the floor at 1667 on win32 (1667*3=5001)", () => {
    stubPlatform("win32");
    expect(osTimeout(1667)).toBe(5001);
  });
});
