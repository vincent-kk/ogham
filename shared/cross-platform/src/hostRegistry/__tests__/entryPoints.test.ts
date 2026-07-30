import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("host registry package entry points", () => {
  it("root-exports host resolution without publishing a subpath", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown>; sideEffects: boolean };
    const rootSource = readFileSync(
      resolve(packageRoot, "src", "index.ts"),
      "utf8",
    );

    expect(Object.keys(manifest.exports)).toEqual([".", "./agy-runner/main"]);
    expect(manifest.sideEffects).toBe(false);
    expect(rootSource).toContain(
      'export { resolveRuntimeHost } from "./hostRegistry/runtime/resolveRuntimeHost.js";',
    );
    expect(rootSource).toContain(
      'export { resolveHostDescriptor } from "./hostRegistry/operations/resolveHostDescriptor.js";',
    );
    expect(rootSource).toContain(
      'export { HOSTS, HOST_MARKER_ENV } from "./hostRegistry/operations/registry.js";',
    );
    expect(rootSource).not.toContain('from "./hostRegistry/index.js"');
    expect(
      existsSync(resolve(packageRoot, "src", "hostRegistry", "index.ts")),
    ).toBe(true);
  });
});
