import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("instruction package entry points", () => {
  it("root-exports read and write operations without publishing subpaths", () => {
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
      'export { readSection } from "./instructions/operations/readSection.js";',
    );
    expect(rootSource).toContain(
      'export { mergeSection } from "./instructions/operations/mergeSection.js";',
    );
    expect(rootSource).toContain(
      'export { removeSection } from "./instructions/operations/removeSection.js";',
    );
    expect(rootSource).not.toContain('from "./instructions/index.js"');
    for (const path of [
      "instructions/index.ts",
      "instructions/read/index.ts",
      "instructions/write/index.ts",
    ])
      expect(existsSync(resolve(packageRoot, "src", path)), path).toBe(true);
  });
});
