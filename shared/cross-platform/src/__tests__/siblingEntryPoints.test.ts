import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { normalizeImportTarget } from "./helpers/normalizeImportTarget.js";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(sourceRoot, "..");
const manifest = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { import: string }> };
const packageEntryTargets = new Set(
  Object.values(manifest.exports).map(({ import: target }) =>
    normalizeImportTarget(
      target.replace("./dist/", "").replace(/\.js$/, ".ts"),
    ),
  ),
);

const boundarySources = [
  "configScope/layers/operations/resolveConfigLayers.ts",
  "configScope/layers/operations/writeConfigLayer.ts",
  "configScope/layers/utils/readLayer.ts",
  "hooks/error/errorLogPath.ts",
  "hostPaths/absolute/toAbsoluteRoot.ts",
  "paths/state/hostStateRoot.ts",
  "paths/state/stateRoot.ts",
] as const;

describe("cross-platform sibling boundaries", () => {
  it.each(boundarySources)(
    "%s uses declared sibling entry points",
    (sourcePath) => {
      const absoluteSourcePath = resolve(sourceRoot, sourcePath);
      const source = readFileSync(absoluteSourcePath, "utf8");
      const importerModule = sourcePath.split("/")[0];
      const violations = [
        ...source.matchAll(/\bfrom\s+["']([^"']+)["']/g),
      ].flatMap((match) => {
        const specifier = match[1];
        if (!specifier?.startsWith(".")) return [];

        const targetPath = relative(
          sourceRoot,
          resolve(
            dirname(absoluteSourcePath),
            specifier.replace(/\.js$/, ".ts"),
          ),
        );
        const normalizedTargetPath = normalizeImportTarget(targetPath);
        const targetModule = normalizedTargetPath.split("/")[0];
        if (
          targetModule === importerModule ||
          packageEntryTargets.has(normalizedTargetPath)
        )
          return [];

        return [`${sourcePath} -> ${specifier}`];
      });

      expect(violations).toEqual([]);
    },
  );

  it("normalizes Windows separators before matching package targets", () => {
    expect(normalizeImportTarget("paths\\state\\pluginCache.ts")).toBe(
      "paths/state/pluginCache.ts",
    );
  });
});
