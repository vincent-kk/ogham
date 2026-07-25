import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("filesystem package entry points", () => {
  it("exposes only purpose-specific read entry points", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };
    expect(manifest.exports).not.toHaveProperty("./filesystem/read");
    expect(manifest.exports).toHaveProperty("./filesystem/read/utf8");
    expect(manifest.exports).toHaveProperty("./filesystem/read/bytes");
    expect(manifest.exports).toHaveProperty("./filesystem/read/directory");
    expect(
      existsSync(resolve(packageRoot, "src", "filesystem", "read", "index.ts")),
    ).toBe(false);
  });

  it("exposes lightweight hook I/O separately from atomic artifact mutation", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };

    expect(manifest.exports).toHaveProperty("./filesystem/hook-io");
  });
});
