import { describe, expect, it } from "vitest";

import { VERSION } from "../index.js";

describe("deilen scaffold", () => {
  it("exposes a semver VERSION", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
