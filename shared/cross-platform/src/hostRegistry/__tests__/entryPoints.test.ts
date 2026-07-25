import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("host registry package entry points", () => {
  it("exposes runtime host resolution without the aggregate registry barrel", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };

    expect(manifest.exports).toHaveProperty("./host-registry/runtime");
    expect(manifest.exports).toHaveProperty("./host-registry/descriptor");
    expect(manifest.exports).toHaveProperty("./host-registry/hosts");
  });
});
