import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("path package entry points", () => {
  it("exposes tree-shake-independent single-purpose path modules", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };

    expect(Object.keys(manifest.exports)).toEqual(
      expect.arrayContaining([
        "./paths/contained",
        "./paths/state-root",
        "./paths/normalize",
        "./paths/relative",
        "./paths/plugin-cache",
        "./host-paths/absolute-root",
        "./compat/basename",
        "./compat/join",
        "./compat/is-absolute",
        "./compat/path-for-compare",
        "./compat/resolve",
      ]),
    );
  });

  it("keeps one declared function per top-level path source file", () => {
    const sourceRoot = resolve(packageRoot, "src", "paths");
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

    expect(violations).toEqual([]);
  });

  it("lets the error-log path function import only plugin-cache", () => {
    const source = readFileSync(
      resolve(packageRoot, "src", "hooks", "error", "errorLogPath.ts"),
      "utf8",
    );

    expect(source).toContain('../../paths/state/pluginCache.js"');
    expect(source).not.toContain("../paths/paths.js");
  });
});
