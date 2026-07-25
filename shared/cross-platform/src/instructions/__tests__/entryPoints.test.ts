import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("instruction package entry points", () => {
  it("separates read-only and write string-operation graphs", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };

    expect(manifest.exports).toHaveProperty("./instructions/read");
    expect(manifest.exports).toHaveProperty("./instructions/write");
  });
});
