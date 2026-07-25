import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("absolute-root source structure", () => {
  it("keeps the compatibility module as a barrel and each function in one file", () => {
    const barrel = readFileSync(resolve(moduleRoot, "absoluteRoot.ts"), "utf8");

    expect(barrel).not.toMatch(/function\s+\w+/);
    for (const name of [
      "expandAbsoluteRootHome.ts",
      "toAbsoluteRoot.ts",
      "requireAbsoluteRoot.ts",
    ])
      expect(existsSync(resolve(moduleRoot, "absolute", name)), name).toBe(
        true,
      );
  });
});
