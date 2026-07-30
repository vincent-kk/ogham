import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { findForbiddenSystemImports } from "./helpers/findForbiddenSystemImports.js";
import { findSiblingBoundaryImports } from "./helpers/findSiblingBoundaryImports.js";
import { isPureNamedBarrel } from "./helpers/isPureNamedBarrel.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoot = resolve(packageRoot, "src");

const entryPoints = [
  "index.ts",
  "project/index.ts",
  "user/index.ts",
  "rules/index.ts",
  "instructions/index.ts",
  "mcp/index.ts",
  "targets/index.ts",
  "transactions/index.ts",
  "validation/index.ts",
] as const;

function productionTypeScriptFiles(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((name) => {
    if (name === "__tests__") return [];
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) return productionTypeScriptFiles(path);
    return name.endsWith(".ts") ? [path] : [];
  });
}

describe("agent-artifacts package architecture", () => {
  it("provides the public root and every internal entry point as pure named barrels", () => {
    for (const relativePath of entryPoints) {
      const path = resolve(sourceRoot, relativePath);
      expect(existsSync(path), relativePath).toBe(true);
      if (!existsSync(path)) continue;

      const source = readFileSync(path, "utf8");
      expect(isPureNamedBarrel(source), relativePath).toBe(true);
      if (relativePath !== "index.ts") continue;

      const rootTargets = [...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)]
        .map((match) => match[1])
        .filter((target): target is string => target !== undefined);
      expect(rootTargets.length).toBeGreaterThan(0);
      for (const target of rootTargets) {
        expect(target, target).toMatch(/^\.\//);
        expect(target, target).toMatch(/\.js$/);
        expect(target, target).not.toMatch(/\/index\.js$/);
        expect(
          existsSync(resolve(dirname(path), target.replace(/\.js$/, ".ts"))),
          target,
        ).toBe(true);
      }
    }
  });

  it("publishes only the named root package address", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      exports: Record<string, unknown>;
      sideEffects: boolean;
    };

    expect(Object.keys(manifest.exports)).toEqual(["."]);
    expect(manifest.sideEffects).toBe(false);
    expect(manifest.dependencies).toMatchObject({
      "@ogham/cross-platform": "workspace:^",
      "smol-toml": "^1.6.1",
    });
  });

  it("keeps production source free of direct system-call imports", () => {
    for (const path of productionTypeScriptFiles(sourceRoot))
      expect(
        findForbiddenSystemImports(readFileSync(path, "utf8")),
        path,
      ).toEqual([]);
  });

  it("routes sibling fractal imports through their entry points", () => {
    const publicRoot = resolve(sourceRoot, "index.ts");
    const violations = productionTypeScriptFiles(sourceRoot)
      .filter((path) => path !== publicRoot)
      .flatMap((path) =>
        findSiblingBoundaryImports(
          sourceRoot,
          path,
          readFileSync(path, "utf8"),
        ),
      );

    expect(violations).toEqual([]);
  });

  it("rejects runtime statements even when a file also has named exports", () => {
    const source = 'export { value } from "./value.js";\nconsole.log(value);\n';
    expect(isPureNamedBarrel(source)).toBe(false);
  });

  it("detects CommonJS access to forbidden Node system modules", () => {
    const source = 'const fs = require("node:fs");\n';
    expect(findForbiddenSystemImports(source)).toEqual(["node:fs"]);
  });

  it("builds the provider after cross-platform and before consumers", () => {
    for (const script of ["buildAll.mjs", "typecheckAll.mjs"]) {
      const source = readFileSync(
        resolve(repositoryRoot, "scripts", script),
        "utf8",
      );
      const crossPlatform = source.indexOf(
        '{ name: "@ogham/cross-platform", dir: "shared/cross-platform" }',
      );
      const agentArtifacts = source.indexOf(
        '{ name: "@ogham/agent-artifacts", dir: "shared/agent-artifacts" }',
      );

      expect(crossPlatform, script).toBeGreaterThanOrEqual(0);
      expect(agentArtifacts, script).toBeGreaterThan(crossPlatform);
    }
  });
});
