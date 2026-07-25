import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const hooksRoot = resolve(packageRoot, "src", "hooks");

describe("error log entry points", () => {
  it("separates display-path reads from log writes", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };

    expect(manifest.exports).toHaveProperty("./error-log/path");
    expect(manifest.exports).toHaveProperty("./error-log/write");
  });

  it("keeps the compatibility module as a pure barrel", () => {
    const path = resolve(hooksRoot, "errorLog.ts");
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, "utf8");

    expect(source).not.toMatch(/^(?:export\s+)?(?:async\s+)?function\s+\w+/m);
    expect(source).toContain("./error/errorLogPath.js");
    expect(source).toContain("./error/logHookFailure.js");
  });
});
