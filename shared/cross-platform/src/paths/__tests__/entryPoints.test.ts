import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("path package entry points", () => {
  it("publishes paths through the exact root-only package contract", () => {
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
      'export { resolveContainedPath } from "./paths/operations/resolveContainedPath.js";',
    );
    expect(rootSource).toContain(
      'export { portableJoin } from "./paths/compat/operations/portableJoin.js";',
    );
    expect(existsSync(resolve(packageRoot, "src", "paths", "index.ts"))).toBe(
      true,
    );
    expect(
      existsSync(resolve(packageRoot, "src", "paths", "compat", "index.ts")),
    ).toBe(true);
  });

  it("keeps root-exported path source files single-purpose", () => {
    const sourceRoot = resolve(packageRoot, "src", "paths");
    const rootSource = readFileSync(
      resolve(packageRoot, "src", "index.ts"),
      "utf8",
    );
    const violations = readdirSync(sourceRoot)
      .filter((name) => name.endsWith(".ts") && name !== "index.ts")
      .flatMap((name) => {
        const declarations =
          readFileSync(resolve(sourceRoot, name), "utf8").match(
            /^(?:export\s+)?(?:async\s+)?function\s+\w+/gm,
          ) ?? [];
        return declarations.length > 1
          ? [`${name}: ${declarations.length}`]
          : [];
      });

    // The object facade stays out of the root contract on purpose: it names all
    // eight path functions, so importing it retains every one of them and
    // defeats the shaking the root-only surface exists to get.
    expect(rootSource).not.toContain("./paths/paths.js");
    expect(existsSync(resolve(sourceRoot, "paths.ts"))).toBe(true);
    expect(violations).toEqual([]);
  });

  it("root-exports error-log path while keeping its dependency concrete", () => {
    const source = readFileSync(
      resolve(packageRoot, "src", "hooks", "error", "errorLogPath.ts"),
      "utf8",
    );
    const rootSource = readFileSync(
      resolve(packageRoot, "src", "index.ts"),
      "utf8",
    );

    expect(rootSource).toContain(
      'export { errorLogPath } from "./hooks/error/errorLogPath.js";',
    );
    expect(source).toContain('../../paths/state/pluginCache.js"');
    expect(source).not.toContain("../paths/paths.js");
  });
});
